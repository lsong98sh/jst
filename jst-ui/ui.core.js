(function(){
var directive_name = "widget";	
jst.directive.insert({
	name: directive_name,
	compile: function($jst, node, result, seq) {
		return true;
	},
	cleanup: function($ctx, node, result, seq) {
		result.code = "jui.create($ctl).render($ctl);\r\n";
	}
}, "end");

function merge(dst){
	for(var i = 1; i < arguments.length; ++ i){
		var src = arguments[i];
		if(src){
			for(var key in src){
				if(!dst[key] || typeof(src[key]) == "function" || typeof(src[key]) != "object" || dst[key] === null){
					dst[key] = src[key];
				}else {
					merge(dst[key], src[key]);
				}
			}
		}
	}
}

var ready = [];
var scheme = {};
var currentScheme = null;
var nws = 0;
var tmpHolder;
var jui = {
	init : function(name, widget){
		if(jui.widgets[name]){
			return;
		}
		holder = $("div[name='" + "jui-widget-" + name +"']");
		if(holder.length == 0 ){
			return;
		}
		jui.widgets[name] = widget;
		widget.styles = {};
		widget.templates = {};
		holder.find("div[type=style]").each(function(){
			widget.styles[$(this).attr("name")] = $(this).html();
		}).remove();
		holder.find("div[type=template]").each(function(){
			widget.templates[$(this).attr("name")] = $(this).html();
		}).remove();
	},
	require : function(widgets){
		widgets.forEach(function(name, idx, array){
			++nws;
			$.get(name+".html", function(html){
				var holder = $("<div></div>");
				holder.append($(html));
				var widget_name = holder.find("script[name]").attr("name");
				if(document.getElementsByName("jui-widget-" + widget_name).length == 0 && !jui.widgets[widget_name]){
					holder.css("display", "none");
					holder.attr("name", "jui-widget-" + widget_name);
					$("body").append(holder);
				}
			}).always(function(){ 
				-- nws;
				if(nws == 0){
					var s = currentScheme;
					currentScheme = null;
					jui.scheme.setCurrentScheme(s);
					setTimeout(function(){
						ready.forEach(function(func, idx, array){
							func();
						});
					}, 0);
				}
			});
		})
	},
	ready : function(func){
		ready.push(func);
	},
	create : function($ctl){
		var name = $ctl.getAttribute("jst-" + directive_name);
		var widget = jst.get_data($ctl, directive_name);
        if(!widget){
        	var wd = jui.widgets[name] || jui.widgets["jui.base"];
			if(wd){
				widget = new Object();
				
				function build(obj, wd){
					if(wd.base){
						build(obj, jui.widgets[wd.base]);
					}
					merge(obj, wd);
				}
				build(widget, wd);
			}
		}
        return widget;
	},	
	widgets : {
		"jui.base" : {
		    properties: {
		    	name: ""
		    },
		    render : function($ctl){
		        var property = {};
		        for(var key in this.properties){
		        	var value = $ctl.getAttribute("property-" + key);
		        	if(value){
		        		property[key] = value;
		        	}
		        }
		        merge(this.properties, jst.get_data($ctl, "property"), property);
		        
		        if(jst.get_data($ctl, directive_name) == null){
		           jst.set_data($ctl, directive_name, this);
		           this.initialize($ctl);
		        } else {
		           this.update($ctl);
		        }
		    },
		    initialize : function(){},
		    update : function(){}
		}
	},
	scheme : {
		add : function(name, obj){
			scheme[name] = obj;
			if(currentScheme == null){
				currentScheme = name;
			}
		},
		setCurrentScheme : function(name){
			if(currentScheme != name){
				currentScheme = name;
				for(var widget_name in jui.widgets){
					var styles = jui.widgets[widget_name].styles;						
					if(styles){
						for(tname in styles){
							var template = styles[tname];					//template 
							var target = document.createElement("div");     	//render target
							var j = new jst(template, target);                  //create and compile template
							j.render(scheme[currentScheme]);
							var holder = $("div[name='jui-widget-"+widget_name+"']");
							var style_name = widget_name + "-" + tname;
							holder.find("style[name='"+style_name+"']").remove();
							holder.append($("<style name='"+ style_name + "'>" + target.innerHTML.replace(/\<\!--.*?--\>/g, "") + "</style>"));
						}
					}
				}
			}
		},
		getCurrentScheme : function(name){
			return currentScheme;
		}
	}
}

window.jui = jui;

})();

