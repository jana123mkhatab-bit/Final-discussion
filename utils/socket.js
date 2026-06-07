'use strict';

let _io = null;

module.exports = {
  init(io) {
    _io = io;
  },

  
  notifyUser(userId, event, data) {
    if (_io && userId) {
      _io.to(`user:${String(userId)}`).emit(event, data);
    }
  },

  getIO() {
    return _io;
  }
};
