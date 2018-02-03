const Promise = require("bluebird")
const xml2js = Promise.promisifyAll(require('xml2js'))
const fs = Promise.promisifyAll(require('fs'))
// console.dir(util)

var builder = new xml2js.Builder()

function parsePOCXML(xml_path) {
  var parser = new xml2js.Parser({explicitArray : false, ignoreAttrs : true})

  return fs.readFileAsync(xml_path).then(function(data) {
    return parser.parseStringAsync(data)
  })
}


function writebackXML(xml_obj, path) {
  var xml_str = builder.buildObject(xml_obj)
  return fs.writeFileAsync(path, xml_str)
}


function bindObjects(canvas, anchor, object_list) {

  function get_coords(ob, align) {
    let option = {}

    switch(align) {
      case 'TOP_LEFT':
        option.left = anchor.left
        option.top = anchor.top - ob.f_object.height
        break

      case 'TOP_RIGHT':
        if(anchor.width > ob.f_object.width)
          option.left = anchor.left + (anchor.width - ob.f_object.width)
        else
          option.left = anchor.left - (ob.f_object.width - anchor.width)

        option.top = anchor.top - ob.f_object.height
        break

      case 'BOTTOM_LEFT':
        option.left = anchor.left
        option.top = anchor.top + anchor.height
        break

      case 'BOTTOM_RIGHT':
        if(anchor.width > ob.f_object.width)
          option.left = anchor.left + (anchor.width - ob.f_object.width)
        else
          option.left = anchor.left - (ob.f_object.width - anchor.width)

        option.top = anchor.top + anchor.height
        break
    }

    if(ob.offset !== undefined) {
      for(var key in ob.offset) {
        switch (key) {
          case 'left':
            option.left += ob.offset.left
            break

          case 'top':
            if(align.includes('TOP'))
              option.top -= ob.offset.top
            else
              option.top += ob.offset.top
            break
        }
      }
    }

    return option
  }


  function follow_anchor(event) {

    for(var ob of object_list) {
      let option = get_coords(ob, ob.align)

      if(option.left < 0) {
        if(ob.align == 'TOP_LEFT')
          option = get_coords(ob, 'TOP_RIGHT')
        else
          option = get_coords(ob, 'BOTTOM_RIGHT')
      }
      else if(option.top < 0) {
        if(ob.align == 'TOP_LEFT')
          option = get_coords(ob, 'BOTTOM_LEFT')
        else
          option = get_coords(ob, 'BOTTOM_RIGHT')
      }

      ob.f_object.set(option)
      ob.f_object.setCoords()
    }

    // canvas.renderAll()
  }

  anchor.on('moving', (e) => follow_anchor(e))
  anchor.on('scaling', (e) => follow_anchor(e))
  anchor.on('rotating', (e) => follow_anchor(e))

  follow_anchor({}) // init gadget position
}


function updateXML(boxs, img_scale, xml) {
  var object_list = []

  for(var box_ob of boxs) {
    let box = box_ob.box
    if(box._removed)
      continue

    let uuid = box._wrong_one && box._uuid > 0 ? -box._uuid : box._uuid
    let xml_obj_tag = {
      name: box._name,
      uuid: uuid,
      bndbox: {
        xmin: parseInt(box.left / img_scale),
        ymin: parseInt(box.top / img_scale),
        xmax: parseInt((box.left + box.width * box.scaleX) / img_scale),
        ymax: parseInt((box.top + box.height * box.scaleY) / img_scale),
      }
    }

    object_list.push(xml_obj_tag)
  }
  console.log(img_scale)
  console.log(object_list)

  xml.annotation.object = object_list
  return xml
}


module.exports.parsePOCXML = parsePOCXML
module.exports.writebackXML = writebackXML
module.exports.bindObjects = bindObjects
module.exports.updateXML = updateXML
