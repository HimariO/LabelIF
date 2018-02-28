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

module.exports = Store
