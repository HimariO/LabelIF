const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const util = require('./util')
const Store = require('./store')

root_path = ''
imgs_path = []
xmls_path = []
xmls_obj = []
xmls_obj_mod = []

var canvas_dom = document.getElementById('center-canvas')
var canvas_ctx = canvas_dom.getContext('2d')
var canvas = undefined

var copy_dom = document.createElement('canvas')
var copy_ctx = copy_dom.getContext('2d')


var store = new Store()
const PREVIEW_EVENT = 'PREVIEW_EVENT'
const CENTER_VIEW_EVENT = 'CENTER_VIEW_EVENT'
const DOC_EVENT = 'DOC_EVENT'

store.AddChannel(PREVIEW_EVENT, {})
store.AddChannel(CENTER_VIEW_EVENT, {
  current_img_id: 0,
  current_img_scale: 1,
  current_boxs: [],
  current_xml: undefined,
  operation_mode: 'VIEW',
})
store.AddChannel(DOC_EVENT, {})


function UpdateCenterImg(type, message) {
  if(type != 'CLICK')
    return

  var img_path = message['img']
  LoadCanvas(img_path, message['id'])
}

store.Subscript(PREVIEW_EVENT, UpdateCenterImg)


function SelectByKey(type, message) {
  if(type != 'KEY_PRESS')
    return
  var c_id = store.channels_state[CENTER_VIEW_EVENT].current_img_id
  console.log('deubg ', c_id)

  switch(message.key_code) {
    /* Select Image By Key */
    case 38: // up
    var new_id = c_id > 0 ? c_id - 1 : c_id
    store.channels_state[CENTER_VIEW_EVENT].current_img_id = new_id
    store.Send(CENTER_VIEW_EVENT, 'KEY_PRESS', {'img_id': new_id})
    break

    case 40: // down
    var new_id = c_id < imgs_path.length - 1 ? c_id + 1 : c_id
    store.channels_state[CENTER_VIEW_EVENT].current_img_id = new_id
    store.Send(CENTER_VIEW_EVENT, 'KEY_PRESS', {'img_id': new_id})
    break

    case 37: // left
    break

    case 39: // right
    break

    /* Select Operation Mode By Key */
    case 27: // Esc
    store.channels_state[CENTER_VIEW_EVENT].operation_mode = 'VIEW'
    canvas.defaultCursor = 'default'
    break

    case 77: // M
    store.channels_state[CENTER_VIEW_EVENT].operation_mode = 'DRAW_BOX'
    canvas.defaultCursor = 'crosshair'
    break
  }
}

store.Subscript(DOC_EVENT, SelectByKey)


function UpdateByKey(type, message) {
  if(type != 'KEY_PRESS')
    return

  var id = message['img_id']
  // $('#center-img').attr('src', imgs_path[id])
  LoadCanvas(imgs_path[id], id)

  $('.preview_hl').removeClass('preview_hl')
  $(`#preview-${id}`).addClass('preview_hl')
  var parent = $(`#preview`)
  var scroll_offset = $(`#preview-${id}`).position().top - parent.position().top + parent.scrollTop()
  // console.log(scroll_offset)
  $('#preview').scrollTop(scroll_offset)
  // $('#preview').animate({scrollTop: scroll_offset}, 500)
}

store.Subscript(CENTER_VIEW_EVENT, UpdateByKey)


function ProcessSubmit(type, message) {
  if(type != 'SUBMIT')
    return

  var input = message.input
  var syntax = /\d+(\,\d+)*/g
  if(!input.match(syntax))
    return

  input.replace(/\s/g, '')
  var indexs = input.split(',')
  // console.log(indexs)

  for(var id of indexs){
    console.log('copyto:', `./result/${id}/`)
    fse.ensureDir(`./result/${id}/`)
    fse.copy(
      imgs_path[message.img_id],
      `./result/${id}/${path.parse(imgs_path[message.img_id]).base}`
    )
  }
}

store.Subscript(CENTER_VIEW_EVENT, ProcessSubmit)


function TopBarEvent(type, message) {
  if(type != 'TOP_BAR')
    return

  if(message.mode) {
    store.channels_state[CENTER_VIEW_EVENT].operation_mode = message.mode
    switch (message.mode) {
      case 'VIEW':
        // $(canvas_dom).css('cursor', 'default')
        // canvas.setCursor('default')
        canvas.defaultCursor = 'default'
        break;

      case 'DRAW_BOX':
        // $(canvas_dom).css('cursor', 'crosshair')
        // canvas.setCursor('crosshair')
        canvas.defaultCursor = 'crosshair'
        break;

      default:
        // $(canvas_dom).css('cursor', 'default')
        // canvas.setCursor('default')
        canvas.defaultCursor = 'default'
    }
  }

  if(message.operation) {
    switch (message.operation) {
      case 'RESET':
        $('#topbar-text').text('Label reset!')
        xmls_obj_mod[store.channels_state[CENTER_VIEW_EVENT].current_img_id] = null
        LoadBoxes(
          store.channels_state[CENTER_VIEW_EVENT].current_img_id,
          store.channels_state[CENTER_VIEW_EVENT].current_img_scale,
          false
        )
        break;
      default:

    }
  }

}

store.Subscript(CENTER_VIEW_EVENT, TopBarEvent)


/*----------------------------------------UI Action-------------------------------------------------*/


function InitCanvasDragDrop() {
  var box, isDown, origX, origY;

  canvas.on('mouse:down', function(o){
    isDown = true
    var pointer = canvas.getPointer(o.e)
    origX = pointer.x
    origY = pointer.y

    switch (store.channels_state[CENTER_VIEW_EVENT].operation_mode) {
      case 'DRAW_BOX':
        box = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          opacity: 0.7,
          strokeWidth: 5,
          stroke: 'red',
          fill: 'rgba(0,0,0,0)',
          selectable: true,
          originX: 'left',
          originY: 'top'
        })

        canvas.add(box)

        break;
      default:
        console.log('Canvas got click!')
    }
  })

  canvas.on('mouse:move', function(o){
    if (!isDown) return

    switch (store.channels_state[CENTER_VIEW_EVENT].operation_mode) {
      case 'DRAW_BOX':
        var pointer = canvas.getPointer(o.e)
        var left = pointer.x < origX ? pointer.x : origX
        var top = pointer.y < origY ? pointer.y : origY

        box.set({
          left: left,
          top: top,
          width: Math.abs(origX - pointer.x),
          height: Math.abs(origY - pointer.y),
        })

        canvas.renderAll()
        break;
      default:
        // console.log('Canvas got click!')
    }
  })

  canvas.on('mouse:up', function(o){
    isDown = false

    switch (store.channels_state[CENTER_VIEW_EVENT].operation_mode) {
      case 'DRAW_BOX':
        box.set({
          stroke: 'rgb(129, 250, 92)',
        })

        f_box = util.XMLObj2Box(
          {
            uuid: store.channels_state[CENTER_VIEW_EVENT].current_boxs.length + 1,
            name: 'person',
          },
          canvas,
          1,
          box
        )

        box.setCoords()
        box._uuid = store.channels_state[CENTER_VIEW_EVENT].max_uuid + 1
        store.channels_state[CENTER_VIEW_EVENT].max_uuid++

        util.bindObjects(canvas, box, [
          {f_object: f_box.gadget[0], align: 'TOP_LEFT', offset: {top: 8}},
          {f_object: f_box.gadget[1], align: 'TOP_LEFT', offset: {top: 8, left: 24}}
        ])

        store.channels_state[CENTER_VIEW_EVENT].current_boxs.push(f_box)
        f_box.gadget.map(g => canvas.add(g))
        f_box.gadget.map(g => g.setCoords())
        canvas.renderAll()
        break
      default:
        // console.log('Canvas got click!')
    }
  })
}


function InitCanvasSize() {
  var parent = $('#center-canvas').parent()
  var h = parent.height()
  var w = parent.width()

  canvas_dom.width = canvas_ctx.width = w
  canvas_dom.height = canvas_ctx.height = h

  copy_dom.width = copy_ctx.width = w
  copy_dom.height = copy_ctx.height = h
}


function LoadBoxes(xml_id, scale, writeback=true) {
  // search xml obj in both list,
  var old_id = xmls_obj.indexOf(store.channels_state[CENTER_VIEW_EVENT].current_xml)
  old_id = old_id == -1 ? xmls_obj_mod.indexOf(store.channels_state[CENTER_VIEW_EVENT].current_xml) : old_id

  // writeback with current_id == xml_id, will cause xml_mod[old_id] == null, and later old_id will always be -1.
  if((store.channels_state[CENTER_VIEW_EVENT].current_xml !== undefined && old_id != xml_id) && writeback) {
    var xml_copy = $.extend(true, {}, store.channels_state[CENTER_VIEW_EVENT].current_xml)  // prevent modifi orginal xml obj

    xmls_obj_mod[old_id] = util.updateXML(
      store.channels_state[CENTER_VIEW_EVENT].current_boxs,
      store.channels_state[CENTER_VIEW_EVENT].current_img_scale,
      xml_copy
    )
    util.writebackXML(xmls_obj_mod[old_id], xmls_path[old_id])
  }

  var xml = xmls_obj_mod[xml_id] === null ? xmls_obj[xml_id] : xmls_obj_mod[xml_id]
  store.channels_state[CENTER_VIEW_EVENT].current_xml = xml
  store.channels_state[CENTER_VIEW_EVENT].current_img_scale = scale
  console.dir(xml)

  for(var old_box of store.channels_state[CENTER_VIEW_EVENT].current_boxs) {
    canvas.remove(old_box.box)
    for(var g of old_box.gadget) {
      canvas.remove(g)
    }
  }

  store.channels_state[CENTER_VIEW_EVENT].current_boxs = []
  var obj_count = 1
  var max_uuid = 0

  if(xml.annotation.object != undefined) {
    let object_list = undefined

    if(xml.annotation.object.length === undefined)
      object_list = [xml.annotation.object]
    else
      object_list = xml.annotation.object

    for(var ob of object_list) {

      let fabric_box = util.XMLObj2Box(ob, canvas, scale)
      fabric_box.box._uuid = fabric_box.box._uuid === 0 ? obj_count : fabric_box.box._uuid

      let box = fabric_box.box
      let wrong_btn = fabric_box.gadget[0]
      let del_btn = fabric_box.gadget[1]

      canvas.add(box)
      canvas.add(wrong_btn)
      if(!box._wrong_one)
        canvas.add(del_btn)

      util.bindObjects(canvas, box, [
        {f_object: wrong_btn, align: 'TOP_LEFT', offset: {top: 8}},
        {f_object: del_btn, align: 'TOP_LEFT', offset: {top: 8, left: 24}}
      ])

      store.channels_state[CENTER_VIEW_EVENT].current_boxs.push({box: box, gadget: [wrong_btn, del_btn]})
      obj_count++
      max_uuid = box._uuid > max_uuid ? box._uuid : max_uuid
    }
  }

  store.channels_state[CENTER_VIEW_EVENT].max_uuid = max_uuid
  canvas.renderAll()
}


function LoadCanvas(src, img_id) {

  fabric.Image.fromURL(src, function(img) {
    let img_ratio = img.width / img.height

    let w_scale = canvas_ctx.width / img.width
    let h_scale = canvas_ctx.height / img.height
    let scale = Math.min(w_scale, h_scale)
    let target_height = img.height * scale
    let target_width = img.width * scale

    // var target_height = canvas_ctx.height > canvas_ctx.width ? canvas_ctx.height : canvas_ctx.width * (1 / img_ratio)
    // var target_width = canvas_ctx.width > canvas_ctx.height ? canvas_ctx.width : canvas_ctx.height * img_ratio
    // var scale = target_width / img.width
    console.log('target size:', target_width, target_height)
    img.set({width: target_width, height: target_height, originX: 'left', originY: 'top'})
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas))
    $('#topbar-text').text(`[image] ${path.parse(src).base}`)
    LoadBoxes(img_id, scale)
  })

  store.Send(CENTER_VIEW_EVENT, 'IMAGE_LOADED', {img: src})
}


function AppendPreview(parent_selector, img_src, id) {
  var img_html = $(`<img src="${img_src}" class="rounded auto-resize-width-90" style="margin: 5px;">`)
  var card_html = $(`
  <div class="preview-card border-top" id="preview-${id}">
    <p style="margin: 1px;">${id}</p>
  </div>
  `)

  img_html.click(function() {
    var message = {
      'img': $(this).attr('src'),
      'id': id
    }
    store.Send(PREVIEW_EVENT, 'CLICK', message)
    store.channels_state[CENTER_VIEW_EVENT].current_img_id = id
    $('.preview_hl').removeClass('preview_hl')
    $(`#preview-${id}`).addClass('preview_hl')
  })

  $(parent_selector).append(card_html)
  $(`#preview-${id}`).append(img_html)
}


function load_data(root_p) {
  root_path = root_p
  $('#upload-section').css('display', 'none')
  $('#canvas-wrapper').css('display', 'block')

  InitCanvasSize()
  canvas = new fabric.Canvas(canvas_dom)
  InitCanvasDragDrop()

  var img_root = path.join(root_p, 'JPEGImages')
  var xml_root = path.join(root_p, 'Annotations')

  fs.readdir(img_root, (err, files) => {
    var count = 0
    for(var f of files){
      if(f.includes('.jpg') || f.includes('.png')){
        var join_path = path.join(img_root, f)
        AppendPreview('#preview', join_path, count)
        imgs_path.push(join_path)
        count++
      }
    }
  })

  fs.readdir(xml_root, (err, files) => {
    var count = 0

    for(var f of files){
      if(f.includes('.xml')){
        var join_path = path.join(xml_root, f)
        let id = count  // make sure id not changed when xml finish parsing.

        xmls_path.push(join_path)
        xmls_obj.push(null)  // preser position for xmlobj
        xmls_obj_mod.push(null)  // preser position for xmlobj

        util.parsePOCXML(join_path).then((result) => {
          xmls_obj[id] = result
        })
        count++
      }
    }
  })
}


$(document).keydown((event)=>{
  // console.log('doc keypress')
  store.Send(DOC_EVENT, 'KEY_PRESS', {'key_code': event.which})
  // store.Send(CENTER_VIEW_EVENT, 'KEY_PRESS', {'key_code': event.which})
})


$('#id-input').keyup(function(event){
  if(event.keyCode == 13) {
    store.Send(CENTER_VIEW_EVENT, 'SUBMIT', {
      'input': $(this).val(),
      'img_id': store.channels_state[CENTER_VIEW_EVENT].current_img_id
    })
    $(this).val('')
    store.Send(DOC_EVENT, 'KEY_PRESS', {'key_code': 40})
  }
})


$('#nav-select').click(function(e) {
  store.Send(CENTER_VIEW_EVENT, 'TOP_BAR', {mode: 'VIEW'})
})

$('#nav-drawbox').click(function(e) {
  store.Send(CENTER_VIEW_EVENT, 'TOP_BAR', {mode: 'DRAW_BOX'})
})

$('#nav-reset').click(function(e) {
  store.Send(CENTER_VIEW_EVENT, 'TOP_BAR', {operation: 'RESET'})
})

$('#nav-export').click(function(e) {
  $('#icon-loading').css('display', 'inline-block')
  let res = util.export_by_uuid(xmls_obj, imgs_path, path.join(root_path, 'Export'))
  console.log('nav-export: ', res)

  if(res)
    $('#topbar-text').text('Dataset successfully exported!')
  else
    $('#topbar-text').text('Dataset fail to export!')

  $('#icon-loading').css('display', 'none')
})

$(window).load(() => {
  ekUpload(load_data)
})
