'use strict';

const fs = require('fs');
const path = require('path');
const GIFEncoder = require('gifencoder');
const Canvas = require('canvas');
const moment = require('moment');

module.exports = {
    /**
     * Initialise the GIF generation
     * @param {string} time
     * @param {number} width
     * @param {number} height
     * @param {string} color
     * @param {string} bg
     * @param {string} name
     * @param {string} title
     * @param {number} frames
     * @param {requestCallback} cb - The callback that is run once complete.
     */
    init: function(time, width=200, height=80, color='000000', bg='ffffff', name='default', title='Countdown!', frames=30, cb){
        // Set some sensible upper / lower bounds
        this.width = this.clamp(width, 150, 500);
        this.height = this.clamp(height, 80, 500);
        this.frames = this.clamp(frames, 1, 90);
        
        this.bg = '#' + bg;
        this.textColor = '#' + color;
        this.name = name;
        
        // loop optimisations
        this.halfWidth = Number(this.width / 2);
        this.halfHeight = Number(this.height / 2);
        
        this.encoder = new GIFEncoder(this.width, this.height);
        this.canvas = new Canvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');
        
        // calculate the time difference (if any)
        let timeResult = this.time(time);
        
        // start the gif encoder
        this.encode(timeResult, time, title, cb);
    },
    /**
     * Limit a value between a min / max
     * @link http://stackoverflow.com/questions/11409895/whats-the-most-elegant-way-to-cap-a-number-to-a-segment
     * @param number - input number
     * @param min - minimum value number can have
     * @param max - maximum value number can have
     * @returns {number}
     */
    clamp: function(number, min, max){
        return Math.max(min, Math.min(number, max));
    },
    /**
     * Calculate the diffeence between timeString and current time
     * @param {string} timeString
     * @returns {string|Object} - return either the date passed string, or a valid moment duration object
     */
    time: function (timeString) {
        // grab the current and target time
        let target = moment(timeString);
        let current = moment();
        
        // difference between the 2 (in ms)
        let difference = target.diff(current);
        
        // either the date has passed, or we have a difference
        if(difference <= 0){
            return 'Date has passed!';
        } else {
            // duration of the difference
            return moment.duration(difference);
        }
    },
    /**
     * Encode the GIF with the information provided by the time function
     * @param {string|Object} timeResult - either the date passed string, or a valid moment duration object
     * @param {requestCallback} cb - the callback to be run once complete
     */
    encode: function(timeResult, time, title, cb){
        let enc = this.encoder;
        let ctx = this.ctx;
        let tmpDir = process.cwd() + '/tmp/';

        // create the tmp directory if it doesn't exist
        if (!fs.existsSync(tmpDir)){
            fs.mkdirSync(tmpDir);
        }
        
        let filePath = tmpDir + this.name + '.gif';
        
        // pipe the image to the filesystem to be written
        let imageStream = enc
                .createReadStream()
                    .pipe(fs.createWriteStream(filePath));
        // once finised, generate or serve
        imageStream.on('finish', () => {
            // only execute callback if it is a function
            typeof cb === 'function' && cb();
        });
        
        // estimate the font size based on the provided width
        let fontSize = Math.floor(this.width / 12) + 'px';
        let fontFamily = 'Courier New'; // monospace works slightly better
        
        // set the font style
        ctx.font = [fontSize, fontFamily].join(' ');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // start encoding gif with following settings
        enc.start();
        enc.setRepeat(0);
        enc.setDelay(1000);
        enc.setQuality(10);
		
		enc.setTransparent(0xFF00FF);

        // if we have a moment duration object
        if(typeof timeResult === 'object'){
            for(let i = 0; i < this.frames; i++){
                // extract the information we need from the duration
                let days = Math.floor(timeResult.asDays());
                let hours = Math.floor(timeResult.asHours() - (days * 24));
                let minutes = Math.floor(timeResult.asMinutes()) - (days * 24 * 60) - (hours * 60);
                let seconds = Math.floor(timeResult.asSeconds()) - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);
                
                // make sure we have at least 2 characters in the string
                days = (days.toString().length == 1) ? '0' + days : days;
                hours = (hours.toString().length == 1) ? '0' + hours : hours;
                minutes = (minutes.toString().length == 1) ? '0' + minutes : minutes;
                seconds = (seconds.toString().length == 1) ? '0' + seconds : seconds;
                
                // build the date string
                let string = [parseInt(days)>0?days:"", parseInt(days)?' days, ':"", parseInt(hours)>0?hours:"", parseInt(hours)>0?' hours\n':"", minutes, ' minutes, ', seconds, ' seconds'].join('');
                
                // paint BG
                ctx.fillStyle = "#000000";
                //ctx.fillRect(0, 0, this.width, this.height);
						
				function fillTextMultiLine(ctx, text, x, y) {
					var lineHeight = ctx.measureText("M").width * 1.5;
					var lines = text.split("\n");
					for (var i = 0; i < lines.length; ++i) {
						ctx.fillText(lines[i], x, y);
						y += lineHeight;
					}
				}
				
			  // http: //www.html5canvastutorials.com/tutorials/html5-canvas-wrap-text-tutorial/
			  function wrapText(context, text, x, y, maxWidth, lineHeight) {
				  lineHeight = lineHeight||(ctx.measureText("M").width * 1.4);
				  var cars = text.split("\n");

				  for (var ii = 0; ii < cars.length; ii++) {

						var line = "";
						var words = cars[ii].split(" ");

						for (var n = 0; n < words.length; n++) {
							 var testLine = line + words[n] + " ";
							 var metrics = context.measureText(testLine);
							 var testWidth = metrics.width;

							 if (testWidth > maxWidth) {
								  context.fillText(line, x, y);
								  line = words[n] + " ";
								  y += lineHeight;
							 }
							 else {
								  line = testLine;
							 }
						}

						context.fillText(line, x, y);
						y += lineHeight;
				  }
			  }
			  
			  let thiswidth = this.width;
			  
				function drawBox(ctx, bg,textColor, num, text, x,y,w,h) {
					ctx.fillStyle = bg;
					ctx.fillRect(x, y, w, h);
					ctx.fillStyle = textColor;
					
					let fontSize = Math.floor(thiswidth / 10) + 'px';
					let fontFamily = 'Open Sans'; // monospace works slightly better
					ctx.font = ""+[fontSize, fontFamily].join(' ');
					
					ctx.fillText(""+num, x+w/2, y+h/2.9);
					
					fontSize = Math.floor(thiswidth / 28) + 'px';
					fontFamily = 'Open Sans'; // monospace works slightly better
					ctx.font = ""+[fontSize, fontFamily].join(' ');
					
					ctx.fillText(""+text, x+w/2, y+h*0.78);
				}
				
				drawBox(ctx, this.bg, this.textColor, days, "DAYS", 0,0,97,80);
				drawBox(ctx, this.bg, this.textColor, hours, "HOURS", 97+15,0,97,80);
				drawBox(ctx, this.bg, this.textColor, minutes, "MINUTES", (97+15)*2,0,97,80);
				drawBox(ctx, this.bg, this.textColor, seconds, "SECONDS", (97+15)*3,0,97,80);
				
				/*
				
				// set font style
				let fontSize = Math.floor(this.width / 12) + 'px';
				let fontFamily = 'Open Sans'; // monospace works slightly better
				ctx.font = "bold "+[fontSize, fontFamily].join(' ');
                
                // paint text
                ctx.fillStyle = this.textColor;
                //ctx.fillText(string, this.halfWidth, this.halfHeight);
                
                wrapText(ctx, title, this.halfWidth, this.halfHeight/4, this.width);
                //ctx.fillText("Countdown to Philly event!", this.halfWidth, this.halfHeight/2); // title
                
				fontSize = Math.floor(this.width / 14) + 'px';
				fontFamily = 'Open Sans'; // monospace works slightly better
				ctx.font = "bold "+[fontSize, fontFamily].join(' ');
                
                let date = time.split("T")[0].split("-");
                let fmt_date = date[1]+'/'+date[2]+'/'+date[0];//
                ctx.fillText(fmt_date, this.halfWidth, this.halfHeight*1.08);
                
				fontSize = Math.floor(this.width / 14) + 'px';
				fontFamily = 'Courier New'; // monospace works slightly better
				ctx.font = [fontSize, fontFamily].join(' ');
                
                fillTextMultiLine(ctx, string, this.halfWidth, this.halfHeight*1.5); // clock
				
				*/
                
                // add finalised frame to the gif
                enc.addFrame(ctx);
                
                // remove a second for the next loop
                timeResult.subtract(1, 'seconds');
            }
        } else {
            // Date has passed so only using a string
            
            // BG
            ctx.fillStyle = this.bg;
            ctx.fillRect(0, 0, this.width, this.height);
            
            // Text
            ctx.fillStyle = this.textColor;
            ctx.fillText(timeResult, this.halfWidth, this.halfHeight);
            enc.addFrame(ctx);
        }
        
        // finish the gif
        enc.finish();
    }
};
