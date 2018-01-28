const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')

imgs_path = []

function Store() {
  this.channels = {}
  this.channels_last_msg = {}
  this.channels_state = {}
}

Store.prototype.AddChannel = function(channel_name, inint_state){
  this.channels[channel_name] = []
  this.channels_last_msg[channel_name] = {}
  this.channels_state[channel_name] = inint_state
}


Store.prototype.Subscript = function(channel_name, callback){
  if(this.channels[channel_name] !== undefined)
    this.channels[channel_name].push(callback)
  else
    throw Error(`Channel '${channel_name}' doesn't exist!`)
}

Store.prototype.Send = function(channel_name, type, message){
  console.log(message)

  if(this.channels[channel_name] !== undefined){

    for(var func of this.channels[channel_name]){
      new_msg = Object.assign({}, {'last_msg': this.channels[channel_name]}, message)
      func(type, new_msg)
    }

    this.channels_last_msg[channel_name] = {
      'message': message,
      'type': type,
    }
  }
  else
    throw Error(`Channel '${channel_name}' doesn't exist!`)
}


var store = new Store()
const PREVIEW_EVENT = 'PREVIEW_EVENT'
const CENTER_VIEW_EVENT = 'CENTER_VIEW_EVENT'
const DOC_EVENT = 'DOC_EVENT'

store.AddChannel(PREVIEW_EVENT, {})
store.AddChannel(CENTER_VIEW_EVENT, {'current_img_id': 0})
store.AddChannel(DOC_EVENT, {})


function UpdateCenterImg(type, message) {
  if(type != 'CLICK')
    return

  var img_path = message['img']
  $('#center-img').attr('src', img_path)

}

store.Subscript(PREVIEW_EVENT, UpdateCenterImg)


function SelectByKey(type, message) {
  if(type != 'KEY_PRESS')
    return
  var c_id = store.channels_state[CENTER_VIEW_EVENT].current_img_id
  console.log('deubg ', c_id)

  switch(message.key_code) {
    case 38: // up
    var new_id = c_id > 0 ? c_id - 1 : c_id
    store.channels_state[CENTER_VIEW_EVENT].current_img_id = new_id
    store.Send(CENTER_VIEW_EVENT, 'KEY_PRESS', {'img_id': new_id})
    break

    case 40: // down
    var new_id = c_id < imgs_path.length ? c_id + 1 : c_id
    store.channels_state[CENTER_VIEW_EVENT].current_img_id = new_id
    store.Send(CENTER_VIEW_EVENT, 'KEY_PRESS', {'img_id': new_id})
    break

    case 37: // left
    break

    case 39: // right
    break
  }
}

store.Subscript(DOC_EVENT, SelectByKey)


function UpdateByKey(type, message) {
  if(type != 'KEY_PRESS')
    return

  var id = message['img_id']
  $('#center-img').attr('src', imgs_path[id])
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

/*----------------------------------------UI Action-------------------------------------------------*/


function AppendPreview(parent_selector, img_src, id) {
  var img_html = $(`<img src="${img_src}" class="rounded auto-resize-width" style="margin: 5px;">`)
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


fs.readdir('img', (err, files) => {
  var count = 0
  for(var f of files){
    if(f.includes('.jpg') || f.includes('.png')){
      var join_path = path.join(__dirname, 'img', f)
      AppendPreview('#preview', join_path, count)
      imgs_path.push(join_path)
      count++
    }
  }
})

$(document).keydown((event)=>{
  // console.log('doc keypress')
  store.Send(DOC_EVENT, 'KEY_PRESS', {'key_code': event.which})
})

$('#id-input').keyup(function(event){
  if(event.keyCode == 13){
    store.Send(CENTER_VIEW_EVENT, 'SUBMIT', {
      'input': $(this).val(),
      'img_id': store.channels_state[CENTER_VIEW_EVENT].current_img_id
    })
    $(this).val('')
    store.Send(DOC_EVENT, 'KEY_PRESS', {'key_code': 40})
  }
})
