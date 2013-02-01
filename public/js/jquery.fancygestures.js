/*

jQuery Fancy Gestures
Copyright (c) 2009 Anant Garg (http://anantgarg.com)

Version: 1.0
Url: http://anantgarg.com/2009/05/21/jquery-fancy-gestures

Original ActionScript Version: Didier Brun (http://www.bytearray.org/?p=91) (didier@bytearray.org)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

(function($){   
  
	$.fn.fancygestures = function(callbackfunction){   
	
		var gestures = new Array();

		// Add new gestures here
		// gestures["RETURNDATA"] = "MOUSESEQUENCE";

		gestures["A"] = "53";
		gestures["B"] = "260123401234";
		gestures["C"] = "43210";
		gestures["D"] = "26701234";
		gestures["E"] = "4321043210";
		gestures["F"] = "42";
		gestures["G"] = "432107650";
		gestures["H"] = "267012";
		gestures["I"] = "6";
		gestures["J"] = "234";
		gestures["K"] = "3456701";
		gestures["L"] = "46";
		gestures["M"] = "6172";
		gestures["N"] = "616";
		gestures["O"] = "432107654";
		gestures["P"] = "670123456";
		gestures["Q"] = "4321076540";
		gestures["R"] = "267012341";
		gestures["S"] = "432101234";
		gestures["T"] = "02";
		gestures["U"] = "21076";
		gestures["V"] = "35";
		gestures["W"] = "2716";
		gestures["X"] = "1076543";
		gestures["Y"] = "21076234567";
		gestures["Z"] = "030";
		gestures[" "] = "0";
		gestures["?"] = "6701232";
		
		// Color & Width of Stroke
		var color = "#ffe700";
		var strokeWidth = 4;

		var element = this;   
		var graphics;
		var position;

		var recording = false;
		var lastPositionX = 0;
		var lastPositionY = 0;
		var moves = new Array;
		 
		var sectorRad = Math.PI*2/8;
		var anglesMap = new Array;
		var step = Math.PI*2/100;
		var sector;

		for (var i = -sectorRad/2; i<=Math.PI*2-sectorRad/2; i+=step){
			sector=Math.floor((i+sectorRad/2)/sectorRad);
			anglesMap.push(sector);
		}
		
		function initialize() {
			graphics = new jsGraphics($(element).attr('id')); 
			position = $(element).offset();
		}

		initialize();

		$(element).mousedown(function(event) {
			recording = true;
			graphics.clear();
			graphics.paint();

			lastPositionX = event.clientX-position.left;
			lastPositionY = event.clientY-position.top;	
		});

		$(element).mousemove(function(event) {
			if(recording == true) {
				var msx = (event.clientX-position.left);
				var msy = (event.clientY-position.top);
				
				var difx = (msx-lastPositionX);
				var dify = (msy-lastPositionY);

				var sqDist = (difx*difx+dify*dify);
				var sqPrec= (8*8);
						
				if (sqDist>sqPrec){
					graphics.setStroke(strokeWidth);
					graphics.setColor(color);
					graphics.drawLine(lastPositionX, lastPositionY, msx,msy);
					graphics.paint();
					lastPositionX=msx;
					lastPositionY=msy;
					addMove(difx,dify);
				}
			}
		});

		$(element).mouseup(function(e) {
			recording = false;
			result = 100000;
			letter = '';

			for (x in gestures) {
				matchMove = gestures[x].split('');
				res = costLeven (matchMove,moves);

				if (res < result && res < 30) {		
					result = res;
					letter = x;
				}
			}

			callbackfunction(letter);

			moves = new Array(0);
			lastPositionX = 0;
			lastPositionY = 0;
		});


		function addMove(dx,dy) {
			var angle = Math.atan2(dy,dx)+sectorRad/2;
			if (angle<0) angle+=Math.PI*2;
			var no = Math.floor(angle/(Math.PI*2)*100);
			moves.push(anglesMap[no]);	
		}

		function difAngle(a,b) {
			var dif =Math.abs(a-b);
			if (dif>8/2)dif=8-dif;
			return dif;
		}

		function fill2DTable(w,h,f){
			var o = new Array(w);
			for (var x=0;x<w;x++){
				o[x]=new Array(h);
				for (var y=0;y<h;y++)o[x][y]=f;
			}
			return o;
		}
				
		function costLeven(a,b){
			
			if (a[0]==-1){
				return b.length==0 ? 0 : 100000;
			}

			var d = fill2DTable(a.length+1,b.length+1,0);
			var w = d.slice();

			for (var x=1;x<=a.length;x++){
				for (var y=1;y<b.length;y++){
					d[x][y]=difAngle(a[x-1],b[y-1]);
				}
			}

			for (y=1;y<=b.length;y++)w[0][y]=100000;
			for (x=1;x<=a.length;x++)w[x][0]=100000;
			w[0][0]=0;

			var cost=0;
			var pa;
			var pb;
			var pc;

			for (x=1;x<=a.length;x++){
				for (y=1;y<b.length;y++){
					cost=d[x][y];
					pa=w[x-1][y]+cost;
					pb=w[x][y-1]+cost;
					pc=w[x-1][y-1]+cost;
					w[x][y]=Math.min(Math.min(pa,pb),pc)
				}
			}

			return w[x-1][y-1];
		}		
	};   
  
})(jQuery);