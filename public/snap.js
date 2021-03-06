var orig_image;
var current_threshold = 0;

function greyscale_image(image, context) {
	var grey_image = context.createImageData(image);
	var data = grey_image.data;
	for(var p=0; p < data.length; p+=4) {
		// var g = (image.data[p] + image.data[p+1] + image.data[p+2])/3;
		// Fancy CIE luminance idea of greyscale
		var g = 0.2126*image.data[p] + 0.7152*image.data[p+1] + 0.0722*image.data[p+2];
		data[p] = data[p+1] = data[p+2] = g;
		data[p+3] = 255;
	}
	return grey_image;
}

function threshold_image(image, context, threshold) {
	var black_image = context.createImageData(image);
	var data = black_image.data;
	for(var p=0; p < data.length; p+=4) {
		var g = 0.2*image.data[p] + 0.7*image.data[p+1] + 0.1*image.data[p+2];
		data[p] = data[p+1] = data[p+2] = g < threshold ? 0 : 255;
		data[p+3] = 255;
	}
	return black_image;
}

function error_diffusion_image(image, context, threshold) {
	var new_image = greyscale_image(image, context);
	var data = new_image.data;
	for(var p=0; p < data.length; p+=4) {
		// var g = (image.data[p] + image.data[p+1] + image.data[p+2])/3;
		// Fancy CIE luminance idea of greyscale
		var g = 0.2126*image.data[p] + 0.7152*image.data[p+1] + 0.0722*image.data[p+2];
		var c = g < threshold ? 0 : 255;
		var e = g - c;
		data[p] = data[p+1] = data[p+2] = c;
		data[p+4] = data[p+5] = data[p+6] = data[p+4] + e;
		data[p+3] = 255;
	}
	return new_image;
}

function bayer_image(image, context, threshold) {
    var bayer_map = [
        [  15, 135,  45, 165 ],
        [ 195,  75, 225, 105 ],
        [  60, 180,  30, 150 ],
        [ 240, 120, 210,  90 ]
    ];
	var new_image = greyscale_image(image, context);
	var data = new_image.data;
	var width = new_image.width, height = new_image.height;
	for(var y=0; y < height; ++y) {
		for(var x=0; x < width; ++x) {
			var p = (y*width+x)*4;
			var oldvalue = (data[p] + bayer_map[x%4][y%4]) >> 1;
			data[p] = data[p+1] = data[p+2] = (oldvalue < threshold ? 0 : 255);
		}
	}
	return new_image;
}

function atkinson_image(image, context, threshold) {
	var new_image = greyscale_image(image, context);
	var data = new_image.data;
	var width = new_image.width, height = new_image.height;
  var err_map = [[1,0], [2,0], [-1,1], [0,1], [1,1], [0,2]];
	for(var y=0; y < height; ++y) {
		for(var x=0; x < width; ++x) {
			var p = (y*width+x)*4;
			var oldvalue = data[p];
      var newvalue = oldvalue < threshold ? 0 : 255;
      data[p] = data[p+1] = data[p+2] = newvalue;
      /* x >> 3 is divide by 8 */
      var err = (oldvalue - newvalue) >> 3;
      for(var i=0; i < err_map.length; ++i) {
        var ax = err_map[i][0], ay = err_map[i][1];
        p = ((y+ay)*width+x+ax)*4;
        data[p] = data[p+1] = data[p+2] = data[p] + err;
      }
		}
	}
	return new_image;
}

function dither_image(image, context, threshold) {
	var new_image = greyscale_image(image, context);
	var data = new_image.data;
	var width = new_image.width, height = new_image.height;
	for(var y=0; y < height; ++y) {
		for(var x=0; x < width; ++x) {
			var p = (y*width+x)*4;
			var oldvalue = data[p];
			data[p] = data[p+1] = data[p+2] = (oldvalue < threshold ? 0 : 255);

			var quant_error = (oldvalue - data[p])/2; //reduce error effect

			var ep = (y*width+x+1)*4;
			data[ep] = data[ep] + 7.0/16*quant_error;
			ep = ((y+1)*width+x-1)*4;
			data[ep] = data[ep] + 3.0/16*quant_error;
			ep = ((y+1)*width+x)*4;
			data[ep] = data[ep] + 5.0/16*quant_error;
			ep = (y*width+x+1)*4;
			data[ep] = data[ep] + 1.0/16*quant_error;
		}
	}
	return new_image;
}

function combine_black(context, image1, image2) {
	var image = context.createImageData(image1);
	var data = image.data;
	for(var p=0; p < data.length; p++) {
		data[p] = data[p+1] = data[p+1] = (image1.data[p] == 0 || image2.data[p] == 0) ? 0 : 255;
		data[p+3] = 255;
	}
	return image;
}

function convolute(kernel, image, new_image, x, y) {
	var data = new_image.data;
	var i = 0;
	var c = 0
	for(var dy=-1; dy < 2; dy++) {
		for(var dx=-1; dx < 2; dx++) {
			c += kernel[i] * image[((y+dy)*new_image.width+(x+dx))*4];
			i++;
		}
	}
	var p = (y*new_image.width+x)*4;
	data[p] = data[p+1] = data[p+2] = 255 - c;
}

function sobel_image(image, context) {
	var kernel_x = [
		-1, 0, 1,
		-2, 0, 2,
		-1, 0, 1 
	];
	var kernel_y = [
		-1, -2, -1,
		0, 0,  0,
		1, 2, 1
	];
	new_image = greyscale_image(image, context);
	for(var y=0; y < new_image.height; ++y) {
		for(var x=0; x < new_image.width; ++x) {
			convolute(kernel_x, image.data, new_image, x, y);
			convolute(kernel_y, image.data, new_image, x, y);
		}
	}
	return new_image;
}

function threshold_value(control) {
	return 255 - parseInt(document.getElementById(control).value);
}

function edge_threshold_image(orig_image, cxt, threshold) {
	var image1 = dither_image(orig_image, cxt, threshold);
	var image2 = threshold_image(sobel_image(orig_image, cxt), cxt, 200);
	return combine_black(cxt, image1, image2);
}

function filter_image_with_chosen_filter(orig_image, cxt, threshold) {
    var filter = $('#filter').get(0).value;
    return window[filter](orig_image, cxt, threshold);
}

function filter_image(orig_image, canvas) {
    var threshold = threshold_value('bright-threshold');
    var diff = Math.abs(current_threshold - threshold);
    if (diff > 5) {
        var cxt = canvas.getContext('2d');
        var image_data = filter_image_with_chosen_filter(orig_image, cxt, threshold);
        cxt.putImageData(image_data, 0, 0);
        current_threshold = threshold;
    }
}

function display_controls() {
	document.getElementById('controls').classList.remove('hide');
}

function get_image_data(canvas) {
	var cxt = canvas.getContext('2d');
	return cxt.getImageData(0, 0, canvas.width, canvas.height);
}

function handle_image(e) {
	if (e.target.files[0] && e.target.files[0].type.match('image/.*')) {
        var image = e.target.files[0];
        $.canvasResize(image, {
            width: 300,
            height: 0,
            callback: function(data, width, height) {
                var img = new Image();
                img.onload = function() {
                    var width = 300;
                    var height = img.height/img.width * width;
                    var canvas = document.createElement('canvas');
                    canvas.setAttribute('id', 'image');
                    canvas.setAttribute('style', 'border: 1px dashed #ccc');
                    canvas.width = width;
                    canvas.height = height;
                    var cxt = canvas.getContext('2d');
                    cxt.drawImage(this, 0, 0, img.width, img.height, 0, 0, width, height);
                    if (arena.firstChild) {
                        arena.removeChild(arena.firstChild);
                    }
                    arena.appendChild(canvas);
                    orig_image = get_image_data(canvas);
                    filter_image(orig_image, canvas);
                    display_controls()
                }
                img.src = data;
            }
        });
    }
}

function send_image(canvas) {
    var form = new FormData();
    var image = canvas.toDataURL('image/png');
    form.append('img', image);
    var req = new XMLHttpRequest();
    req.onload = function() {
        if (req.status == 204) {
            alert('Sent');
        } else {
            alert('Error: '+req.status);
        }
    }
    req.open("POST", "/");
    req.send(form);
}

if (window.File && window.FileReader && window.FileList && window.Blob) {
    $('#upload').change(handle_image);
    $('#filter').change(function(e) {
        current_threshold = 0;
        filter_image(orig_image, $('#image').get(0));
    });
    $('#bright-threshold').on('change', function() {
		filter_image(orig_image, $('#image').get(0));
	});
    $('#send-image').click(function() {
		send_image($('#image').get(0));
	});
}
