var SCREEN_WIDTH = 256;
var SCREEN_HEIGHT = 240;
var FRAMEBUFFER_SIZE = SCREEN_WIDTH*SCREEN_HEIGHT;

var canvas_ctx, image;
var framebuffer_u8, framebuffer_u32;

var AUDIO_BUFFERING = 1024;
var SAMPLE_COUNT = 4*1024;
var SAMPLE_MASK = SAMPLE_COUNT - 1;
var audio_samples_L = new Float32Array(SAMPLE_COUNT);
var audio_samples_R = new Float32Array(SAMPLE_COUNT);
var audio_write_cursor = 0, audio_read_cursor = 0;

$(function() {
  alert('15');

  window.onerror = function(error) {
    alert(error);
  }

  var appCache = window.applicationCache;

  appCache.update(); // Attempt to update the user's cache.

  if (appCache.status == window.applicationCache.UPDATEREADY) {
    appCache.swapCache();  // The fetch was successful, swap in the new cache.
  }

  // Check if a new cache is available on page load.
  window.addEventListener('load', function(e) {
    window.applicationCache.addEventListener('updateready', function(e) {
      if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
        // Browser downloaded a new app cache.
        if (confirm('A new version of this site is available. Load it?')) {
          window.location.reload();
        }
      } else {
        // Manifest didn't change. Nothing new to server.
      }
    }, false);
  }, false);

  h = window.screen.availHeight
  w = window.screen.availWidth

  if (h >= 640) {
    $("#portrait_up").css("top", "61%")
    $("#portrait_right").css("top", "70%")
    $("#portrait_down").css("top", "75%")
    $("#portrait_left").css("top", "70%")
    $("#portrait_select").css("top", "84%")
    $("#portrait_start").css("top", "84%")
    $("#portrait_B").css("top", "66%")
    $("#portrait_A").css("top", "60%")
  }

//  if(!jQuery.browser.mobile){
//    $('#home').hide();
//    $('#play').hide();
//    $('#desktopLanding').fadeIn(500);
//  }
  
function nes_init(canvas_id){
	var canvas = document.getElementById(canvas_id);
	canvas_ctx = canvas.getContext("2d");
	image = canvas_ctx.getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	
	canvas_ctx.fillStyle = "black";
	canvas_ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	
	// Allocate framebuffer array.
	var buffer = new ArrayBuffer(image.data.length);
	framebuffer_u8 = new Uint8ClampedArray(buffer);
	framebuffer_u32 = new Uint32Array(buffer);
	
	// Setup audio.
	var audio_ctx = new (window.AudioContext || window.webkitAudioContext);
	var script_processor = audio_ctx.createScriptProcessor(AUDIO_BUFFERING, 0, 2);
	script_processor.onaudioprocess = audio_callback;
	script_processor.connect(audio_ctx.destination);
}

function nes_boot(rom_data){
	nes.loadROM(rom_data);
	window.requestAnimationFrame(onAnimationFrame);
}

function nes_load_data(canvas_id, rom_data){
	nes_init(canvas_id);
	nes_boot(rom_data);
}

  var db = openDatabase('webnes', '1.0', 'Downloaded NES ROMs', 2 * 1024 * 1024);
  var nes = new jsnes.NES({
    onFrame: function(framebuffer_24){
      for(var i = 0; i < FRAMEBUFFER_SIZE; i++) framebuffer_u32[i] = 0xFF000000 | framebuffer_24[i];
    },
    onAudioSample: function(l, r){
      audio_samples_L[audio_write_cursor] = l;
      audio_samples_R[audio_write_cursor] = r;
      audio_write_cursor = (audio_write_cursor + 1) & SAMPLE_MASK;
    },
  });
  function onAnimationFrame(){
	window.requestAnimationFrame(onAnimationFrame);
	
	image.data.set(framebuffer_u8);
	canvas_ctx.putImageData(image, 0, 0);
	nes.frame();
}

function audio_remain(){
	return (audio_write_cursor - audio_read_cursor) & SAMPLE_MASK;
}

function audio_callback(event){
	var dst = event.outputBuffer;
	var len = dst.length;
	
	if(audio_remain() < AUDIO_BUFFERING) nes.frame();
	
	var dst_l = dst.getChannelData(0);
	var dst_r = dst.getChannelData(1);
	for(var i = 0; i < len; i++){
		var src_idx = (audio_read_cursor + i) & SAMPLE_MASK;
		dst_l[i] = audio_samples_L[src_idx];
		dst_r[i] = audio_samples_R[src_idx];
	}
	
	audio_read_cursor = (audio_read_cursor + len) & SAMPLE_MASK;
}

  function renderItem(record) {
    var item = $('<li/>').text(record.name).attr('id', record.id);
    var alerted = false;
    var timeoutId = 0;
    var startEvent = 'touchstart';
    var stopEvent = 'touchend';
    item.bind(startEvent, function() {
      alerted = false;
      timeoutId = window.setTimeout(function() {
        alerted = true;
        if (!confirm("Delete this ROM?")) return;
        db.transaction(function(tx){
          tx.executeSql('DELETE FROM roms WHERE id = ?', [record.id], function() {
            localStorage.removeItem(record.storage);
            item.remove();
          });
        });
      }, 1000);
    }).bind(stopEvent, function() {
      clearTimeout(timeoutId);
      if (alerted) return;
      $('#home').slideUp(250);
      $('#play').slideDown(250);
      $('#portrait_controls').slideDown(250);
    
      if (nes.loadedId !== record.id) {
        var rom = localStorage.getItem(record.storage);
        nes_load_data("screen",rom);
        nes.loadedId = record.id;
      }
      $(document).bind('touchmove', function(e) {
        e.preventDefault();
      });
    });
    return item;
  };

  function addRom(name, url) {
    $.ajax({
      type: 'GET',
      url: url,
      timeout: 3000,
      mimeType: 'text/plain; charset=x-user-defined',
      success: function(data) {
        var key = Math.random().toString(36).slice(2);
        localStorage.setItem(key, data);
        db.transaction(function(tx){
          tx.executeSql('INSERT INTO roms (id, name, storage) VALUES (?, ?, ?)', [null, name, key]);
          tx.executeSql('SELECT * FROM roms WHERE storage = ?', [key], function(tx, result) {
            $('#scroll ul').append(renderItem(result.rows.item(0)));
          });
        });
      }
    });
  }

  db.transaction(function(tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS roms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, storage TEXT)');
    tx.executeSql('SELECT * FROM roms', [], function(tx, result) {
      for (var i = 0; i < result.rows.length; i++) {
        $('#scroll ul').append(renderItem(result.rows.item(i)));
      }
      if (result.rows.length == 0) {
        addRom('Croom', 'roms/croom.nes');
        addRom('Tetramino', 'roms/lj65.nes');
        addRom('Galaxy Patrol', 'roms/galaxy.nes');
        addRom('Fighter F-8000', 'roms/fighter_f8000.nes');
        addRom('BoxBoy', 'roms/BOXBOY.nes');
      }
    });
  });  

  $("#addROM").click(function() {
    Dropbox.choose({
      success: function(files) {
        files.forEach(function(file) {
          addRom(file.name.replace('.nes', ''), file.link);
        });
      },
      linkType: "direct",
      multiselect: true,
      extensions: ['.nes']
    });
  });
  var buttons = [ '#portrait_A', '#portrait_B', '#portrait_select','#portrait_start', '#portrait_up', '#portrait_down', '#portrait_left', '#portrait_right' ];
  var startEvent = 'touchstart';
  var stopEvent = 'touchend';
  var player = 1;
  $("#portrait_A").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_A);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_A);
  });
  $("#portrait_B").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_B);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_B);
  });
  $("#portrait_select").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_SELECT);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_SELECT);
  });
  $("#portrait_start").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_START);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_START);
  });
  $("#portrait_up").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_UP);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_UP);
  });
  $("#portrait_down").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_DOWN);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_DOWN);
  });
  $("#portrait_left").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_LEFT);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_LEFT);
  });
  $("#portrait_right").bind(startEvent, function() {
  	nes.buttonDown(player, jsnes.Controller.BUTTON_RIGHT);
  }).bind(stopEvent, function() {
      	nes.buttonUp(player, jsnes.Controller.BUTTON_RIGHT);
  });
});
