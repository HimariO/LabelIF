const ndarray = require('ndarray')
const ops = require('ndarray-ops')

function img2fp32(img_data) {

  let dataTensor = ndarray(img_data.data, [img_data.width, img_data.height, 4])
  let dataProcessedTensor = ndarray(new Float32Array(img_data.width * img_data.height * 3), [img_data.width, img_data.height, 3])
  ops.assign(dataProcessedTensor.pick(null, null, 0), dataTensor.pick(null, null, 0))
  ops.assign(dataProcessedTensor.pick(null, null, 1), dataTensor.pick(null, null, 1))
  ops.assign(dataProcessedTensor.pick(null, null, 2), dataTensor.pick(null, null, 2))
  ops.divseq(dataProcessedTensor, 255)
  return dataProcessedTensor.data

  var fp_array = new Float32Array(img_data.height * img_data.width * 3)

  for (var h = 0; h < img_data.height; h++) {
    for (var w = 0; w < img_data.width; w++) {
      let index = (h * img_data.height + w)
      let index_offset = index * 4

      let r = img_data.data[index_offset]
      let g = img_data.data[index_offset + 1]
      let b = img_data.data[index_offset + 2]
      let a = img_data.data[index_offset + 3]

      fp_array[index * 3] = r / 255
      fp_array[index * 3 + 1] = g / 255
      fp_array[index * 3 + 2] = b / 255
    }
  }
  return fp_array
}

function output2box(img_data, output, output_shape, anchor, classes, threshold) {
  if (output_shape.length != 3) throwError('YOLOv2\'s output shape must have 3 dimension.')
  if (output_shape[0] * output_shape[1] * output_shape[2] != output.length) throwError('shape don\'t match output itself!')

  function sigmoid(t) {
    return 1 / (1 + Math.pow(Math.E, -t));
  }

  function softmax(arr) {
    return arr.map(function(value,index) {
      return Math.exp(value) / arr.map( function(y /*value*/){ return Math.exp(y) } ).reduce( function(a,b){ return a+b })
    })
  }

  let anchor_n = anchor.length
  let class_n = classes.length
  let abchor_size = (class_n + 5)
  let boxes = []

  for (var h = 0; h < output_shape[0]; h++) {
    for (var w = 0; w < output_shape[1]; w++) {
      for (var a = 0; a < anchor_n; a++) {
        let offset = a * abchor_size + (h * abchor_size * output_shape[1] * anchor_n) + (w * anchor_n * abchor_size)

        let box = {
          x: (sigmoid(output[offset]) + w) / output_shape[0],
          y: (sigmoid(output[offset + 1]) + h) / output_shape[0],
          w: (Math.exp(output[offset + 2]) * anchor[a][0]) / output_shape[0],
          h: (Math.exp(output[offset + 3]) * anchor[a][1]) / output_shape[0],
          score: sigmoid(output[offset + 4]),
          cls: softmax(output.slice(offset + 5, offset + 5 + class_n)),
        }
        box.box_score = box.score * Math.max(...box.cls)

        if(box.box_score > threshold)
          boxes.push(box)
      }
    }
  }

  var boxes_coord = []
  for(var box of boxes) {
    let new_box = {
      x_min: (box.x - box.w / 2) * img_data.width,
      x_max: (box.x + box.w / 2) * img_data.width,
      y_min: (box.y - box.h / 2) * img_data.height,
      y_max: (box.y + box.h / 2) * img_data.height,
      score: box.box_score,
      cls: classes[box.cls.indexOf(Math.max(...box.cls))],
    }
    boxes_coord.push(new_box)
  }

  return boxes_coord
}


function NMS(boxes, threshold) {

  function get_box_area(box) {
    let w = box.x_max - box.x_min
    let h = box.y_max - box.y_min
    return w * h
  }

  let box_by_cls = {}

  // group by object class
  for (let box of boxes) {
    if (box_by_cls[box.cls] === undefined)
      box_by_cls[box.cls] = [box]
    else
      box_by_cls[box.cls].push(box)
  }

  let picked_box = []

  for (let cls_name in box_by_cls) {
    box_by_cls[cls_name].sort((a, b) => b.score - a.score) // Descending order

    while (box_by_cls[cls_name].length > 0) {
      let base_box = box_by_cls[cls_name][0]
      let base_area = get_box_area(base_box)
      picked_box.push(base_box)

      box_by_cls[cls_name] = box_by_cls[cls_name].filter((box, i, a) => {
        let box_area = get_box_area(box)
        let intersect = (
          Math.min(base_box.x_max, box.x_max) *
          Math.max(base_box.x_min, box.x_min) *
          Math.min(base_box.y_max, box.y_max) *
          Math.max(base_box.y_min, box.y_min)
        )
        let IOU = intersect / (base_area + box_area - intersect)

        return IOU > threshold
      })
    }
  }

  return picked_box
}


function DrawBox(ctx, img_data, boxes) {
  ctx.putImageData(img_data, 0, 0)

  for (let box of boxes) {
    ctx.beginPath()
    ctx.lineWidth = "4"
    ctx.strokeStyle = "green"
    ctx.rect(
      box.x_min,
      box.y_min,
      box.x_max - box.x_min,
      box.y_max - box.y_min,
    )
    ctx.stroke()
  }
}


const model = new KerasJS.Model({
  filepath: './yolo.bin',
  gpu: true
})

const anchor = [
  [0.57273, 0.677385],
  [1.87446, 2.06253],
  [3.33843, 5.47434],
  [7.88282, 3.52778],
  [9.77052, 9.16828]
]

const classes = [
  'person',
  'bicycle',
  'car',
  'motorbike',
  'aeroplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'sofa',
  'pottedplant',
  'bed',
  'diningtable',
  'toilet',
  'tvmonitor',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
]
console.log('Model: ', model)


function model_predict(image_data) {
  const inputData = {
    input_1: img2fp32(image_data)
  }

  model.predict(inputData).then(outputData => {
    console.log('model predict:')
    console.log(outputData)
    // console.log(outputData.conv2d_23.slice(0, 425))
    let boxes = output2box(
      image_data,
      outputData.conv2d_23,
      [19, 19, 85 * 5],
      anchor,
      classes,
      0.29
    )
    boxes = NMS(boxes, 0.5)
    console.log(boxes)
    let ctx = document.getElementById('yolo-canvas').getContext('2d')
    DrawBox(ctx, image_data, boxes)
  })
  .catch(err => {
    console.error(err)
  })
}


model
.ready()
.then(() => {
  console.log('try to predict...')

  var canvas = document.createElement('canvas')
  canvas.height = 608
  canvas.width = 608

  var ctx = canvas.getContext('2d')
  var test_img = new Image()

  test_img.onload = function() {
    ctx.drawImage(test_img, 0, 0, canvas.width, canvas.height)
    let image_data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    console.log('image_data: ', image_data)

    // make predictions
    let s = new Date()
    for (var i = 0; i < 1; i++) {
      model_predict(image_data)
    }
    let e = new Date()
    console.log(`${(e - s) / 10} ms!`)
  }

  test_img.src = './dog.jpg'
})
