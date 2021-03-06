/*
 * DragResize.js
 * 
 * Copyright (c) 2012, Marius Giepz. All rights reserved.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301  USA
 */

var DragResize = Backbone.View.extend({

	initialize: function(args) {

		this.workspace = args.workspace;

		this.dragging = false;

		_.bindAll(this, "render","summonDragResize","banishDragResize","submit","finished");

	},
	render: function() {

		//The resize-area
		$(this.el).append('<div id="resizearea" class="resize resize_region"/>');
		$('#resizearea').hide();

		//the drag-handle
		$('#resizearea').append('<div id="draghandle" class="resize resize_horizontal"/>');
		$('#draghandle').css('display', 'none')

		$('#resizearea').mouseover( function() {
			if(!this.dragging == true ) $('#draghandle').css('display', 'block');
		});
		$('#resizearea').mouseout( function() {
			if(!this.dragging == true ) $('#draghandle').css('display', 'none'); //.css('margin-top', '-2px');
		});
	},
	summonDragResize: function(event) {

		if( !this.dragging == true 
			&& !$(event.currentTarget).parent().children('.saiku').last().is($(event.currentTarget))) {

			var self = this;
			var colHeader = $(event.currentTarget);

			var colHeaderPos = colHeader.position();
			var colHeaderWidth = colHeader.width();
			var colHeaderHeight = colHeader.height();
			var areaWidth = $('#resizearea').width();
			var padding = parseInt(colHeader.css('padding-right').replace("px", ""));

			$('#resizearea').css('top', colHeaderPos.top);
			$('#resizearea').css('left', 12 + colHeaderPos.left + colHeaderWidth - areaWidth + (2 * padding)) ;
			$('#resizearea').css('height', colHeaderHeight);

			$('#resizearea').show();

			$(event.currentTarget).parent().addClass('resizable_row');

			var borderPosition = $('.workspace_report_canvas').position();
			var borderHeight = $('.workspace_report_canvas').height();

			var borderTop = borderPosition.top;

			//calculate the containment

			var td_elements = $(event.currentTarget).add($(event.currentTarget).next("td"));

			//This will hold the extreme points of the containment
			var points = {
				left: td_elements.eq(0).position().left,
				top: td_elements.eq(0).position().top,
				right: 0,
				bottom: 0
			};

			//Find the points of the containment
			td_elements.each( function() {
				console.log($(this).attr('class'));
			
				var t = $(this);
				var p = t.position();
				var width = t.width();
				var height = t.height();

				points.left = Math.min(p.left, points.left);
				points.top  = Math.min(p.top , points.top );
				points.right = Math.max( points.right, p.left + width);
				points.bottom = Math.max( points.bottom, p.top + height);
			});
		
			$helper = $('#resizer').addClass('resizer').css({height: borderHeight});//,{top: borderTop});

//it sometimes mixes up the one that is being dragged with its neighbor


			$('#draghandle').css('height', colHeaderHeight).draggable({	
				helper : function() {				
					return $helper.clone().removeAttr( "id" ).removeClass("hide");
				} ,
				//delay: 1500,
				grid: [5, 20],
				containment:  [points.left + 30, points.top, points.right - 30, points.bottom],
				axis: 'x',
				start: function(event,ui){
					$(ui.helper).css({top: borderTop - points.top});
					console.log("start dragging");
					self.dragging = true;
				},
				dragging: function(event,ui) {
					event.stopPropagation();
				},
				stop : function(event,ui) {
					console.log("start dragging");
					self.dragging = false;
					
					var $ele = $('.resizable_row');
					var containmentWidth = $ele.width();

					var delta = ui.position.left - ui.originalPosition.left;
					var one = 100 / containmentWidth;
					var prcChange = one * delta;

					var clazz = colHeader.attr('class').split(/\s+/);

					var elementClass;

					//find the relevant class
					for (var i = 0; i < clazz.length; i++) {
						var c = clazz[i];
						if(c.substring(0, 3) == "rpt") {
							elementClass=c;
							break;
						}
					}
						self.workspace.query.action.get("/FORMAT/ELEMENT/" + elementClass , {
							success: function(model, response) {
								self.submit(model, response, prcChange, elementClass);
							}
						});
				}
			});

		}

	},
	banishDragResize: function(event) {

	if(!this.dragging==true){

		var el = event.relatedTarget;
		var position = $(el).offset()
		var height = $(el).height()
		var width = $(el).width()
		if (event.pageY > position.top || event.pageY < (position.top + height)
		|| event.pageX > position.left
		|| event.pageX < (position.left + width)) {
			return true;
		}

		$('#resizearea').hide();
		
	}
		
	},
	submit: function(model, response, prcChange, elementClass) {
		// Notify server
		var out = $.extend(true, {}, emptyFormat);
		out.value=response.value;

		var lastRealWidth = response.format.width;
		var newRealWidth = lastRealWidth + prcChange;
		out.format.width = newRealWidth;

		this.workspace.query.action.post("/FORMAT/ELEMENT/" + elementClass, {
			success: this.finished,
			data: out
		});

		return false;
	},
	finished: function(response) {
		this.workspace.query.run();
	},
});