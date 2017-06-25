"use strict";
(function(){
	var REGEX_EXPRESSION = /\{\{(.+?)\}\}/g,
		directives = [], stock_functions = {},
		jst_attr_prefix = window.jst_attr_prefix || "jst-",
		str_escape_ary = [ [/\\/g, "\\\\"], [/\"/g, "\\\""], [/\t/g, "\\t"], [/\r/g, "\\r"],[/\n/g, "\\n"],],
		strconv = function(str, ary){ary.every(function(v, i){str = str.replace(v[0], v[1]);return true;});return str;},
		uuid = function(len) {
		    var s = "", digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
			len = len? len : 16;
		    while(s.length < len){
		        s += digits.charAt(Math.floor(Math.random() * digits.length));
		    }
		    return s;
		},
		expression = {
			split : function(expr, fmatch, fremain){
				var parts = [];
				var s, p = 0;
				REGEX_EXPRESSION.lastIndex = 0;
		
				while ((s = REGEX_EXPRESSION.exec(expr))) {
					if (s.index > p) {
						parts.push(fremain(expr.substring(p, s.index)));
					}
					parts.push(fmatch(s[1]));
					p = s.index + s[0].length;
				}
				if(p < expr.length){
					parts.push(fremain(expr.substring(p)));
				}
				return parts;
			},
			as_value : function(s){
				if(expression.test("var x=?;",s)){
					return "function(){try{return "+ s +"; }catch(err){return ''}}()";
				}
			},
			as_string : function(expr){
				return expression.split(expr, function(s){
					return expression.as_value(s);
				}, function(s){
					return "\"" + strconv(s, str_escape_ary) + "\"";
				}).join("+");
			},
			as_call : function(expr){
				return expr.replace(/(^\s*)|([;\s]*$)/g, "") + ";";
			},
			test: function(syntax, value){
				try{
					var f = new Function(syntax.replace(/\?/g, value));
					return true;
				}catch(e){
					throw "illegal expression:" + value;
				}
			}
		},
		directive = {
			match : function(name, nodeName){
				return (name != "*") && ((jst_attr_prefix + name == nodeName) || (name.match(/\*$/g) && nodeName.indexOf(jst_attr_prefix + name.substr(0, name.length-1))==0));
			},
			processorOf : function(nodeName){
				return directives.find(function(e){return directive.match(e.name, nodeName);});
			},
			indexOf : function(name){
				return directives.findIndex(function(e){return e.name == name});
			},
			find : function(nodeName){
				var n = directive.indexOf(name);
				if(n >= 0){
					return directives[n];
				}
			},
			insert : function(new_directive, name){
				var n = directive.indexOf(name);
				if(n >= 0){
					directives.splice(n, 0, new_directive);
				}
			},
			remove: function(name){
				var n = directive.indexOf(name);
				if(n >= 0){
					directives.splice(n,1);
				}
			}
		},
		get_attribute_names = function(node){
			var i = 0, attrs = [];
			for(; i < node.attributes.length; ++i){
				if(node.attributes[i] && node.attributes[i].specified){
					attrs.push(node.attributes[i].nodeName);
				}
			}
			return attrs;
		},
		compile_as_call = function(node, nodeName){
			var expr = "", nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				expr = nodeValue.replace(/(^\s*)|([;\s]*$)/g, "") + ";";
				node.removeAttribute(nodeName);
			}
			return expr;
		},
		node_contains_directive = function(node){
			var attr = get_attribute_names(node);
			for(var i=0;i<attr.length; ++i){
				if(directive.processorOf(attr[i]) != undefined || ("" + node.getAttribute(attr[i])).match(REGEX_EXPRESSION)){
					return true;
				}
			}
			return false;
		},
		get_node_text = function(node, preserveWhiteSpace){
			var result, parent = node.parentNode,
				sibling = node.nextSibling,
				elm = document.createElement("div");
			elm.appendChild(node);
			result = elm.innerHTML;
			if(sibling) {
				parent.insertBefore(node, sibling);
			} else {
				parent.appendChild(node);
			}
			return preserveWhiteSpace ? result : result.replace(/(^\s*)|(\s*$)/g, "");
		};		
	
	directives.push({
		name: "skip",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				result.recursive = false;
				var i, attrs=get_attribute_names(node);
				for(i = 0; i < attrs.length; ++ i){
					nodeName = attrs[i];
					if(directive.processorOf(nodeName) !== undefined){
						node.removeAttribute(nodeName);
					}
				}
				return false;
			}
			return true;
		}
	});

	directives.push({
		name: "begin",
		compile: function($jst, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "begin");
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "end");
		}
	});
	directives.push({
		name: "if",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				if(expression.test("if(?){}", nodeValue)){
					result.code = "if(" + nodeValue + "){\n$ctl=$ctx.ensure_node($ctl, "+seq+");\n";
				}
			}
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				result.code = "}else{$ctl = $ctx.comment_node($ctl, "+seq+");}";
				node.removeAttribute(nodeName);	
			}
		}
	});
	directives.push({
		name: "repeat",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				if(expression.test("for(?){}", nodeValue)){
					result.code = "for(" + nodeValue + ") {";
				}
				nodeName = jst_attr_prefix + "filter";
				nodeValue = node.getAttribute(nodeName);
				if(nodeValue != null){
					if(expression.test("if(?){}", nodeValue)){
						result.code += "if(" + nodeValue + ") {";
					}
				}
				result.code += "\n$ctl=$ctx.ensure_node($ctl, "+seq+");\n";
			}
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			var nodeName=jst_attr_prefix + this.name, nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				result.code = "\n$ctl = $ctx.next_node($ctl, "+seq+");\n";
				nodeName = jst_attr_prefix + "filter";
				nodeValue = node.getAttribute(nodeName);
				if(nodeValue != null){
					result.code += "}\n";
					node.removeAttribute(nodeName);	
				}
				result.code += "}\n";
				result.code += "$ctl = $ctx.cleanup_node($ctl, "+seq+");\n";
				node.removeAttribute(jst_attr_prefix + this.name);	
			}
		}
	});	
	
	directives.push({
		name: "filter"	
	});
	
	directives.push({
		name: "item-begin",
		compile: function($jst, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + this.name);
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "item-end");
			return true;
		}		
	});	

	directives.push({
		name: "html",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue= node.getAttribute(nodeName);
			if(nodeValue != null){
				result.code = "$ctl.innerHTML=" + expression.as_string(nodeValue) + ";\n";
				node.removeAttribute(nodeName); 
				node.removeAttribute(jst_attr_prefix + "text");
			}
			return true;
		}
	});
	directives.push({
		name: "text",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue= node.getAttribute(nodeName);
			if(nodeValue != null){
				result.code = "$ctl.innerText=" + expression.as_string(nodeValue) + ";\n";
				node.removeAttribute(nodeName); 
			}
			return true;
		}
	});		
	
	directives.push({
		name: "bind",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue= node.getAttribute(nodeName);
			if(nodeValue!=null){
				var bind = nodeValue.split("@");
				var obj = bind[0] || "$data", key = bind[1];
				if(expression.test("var x=?;", obj)){
					result.code += "$ctx.set_data($ctl, \"@bind-obj\", " + obj + ");\n";
					result.code += "$ctx.set_data($ctl, \"@bind-key\", " + expression.as_string(key) + ");\n";
				}
				node.removeAttribute(nodeName);
			}
			return true;
		}
	});	

	directives.push({
		name: "set-*",
		compile: function($jst, node, result, seq) {
			var i, attrs=get_attribute_names(node), nodeName, nodeValue;
			for(i=0; i < attrs.length; ++i){
				nodeName = attrs[i];
				if(nodeName.indexOf(jst_attr_prefix + "set-") == 0){
					nodeValue = node.getAttribute(nodeName);
					if(expression.test("var x=?;", nodeValue)){
						result.code += "$ctx.set_data($ctl, \"" + nodeName.substr(jst_attr_prefix.length+this.name.length-1) + "\" , " + nodeValue + ");\n";
						node.removeAttribute(nodeName);
					}
				}
			}
			return true;
		}
	});	
	
	directives.push({
		name: "on*",
		compile: function($jst, node, result, seq) {
			var i, attrs=get_attribute_names(node), nodeName, nodeValue, expr;
			for(i=0; i < attrs.length; ++i){
				nodeName = attrs[i];
				if(nodeName.indexOf(jst_attr_prefix + "on") == 0){
					nodeValue = node.getAttribute(nodeName);
					expr = strconv("with($data) {"+nodeValue+" }", str_escape_ary);
					//result.code += "$ctl['onclick_fnc'] = new Function('$data', \"" + expr + "\".replace(/\{\{(.+?)\}\}/g, function(){return eval(arguments[1]);}));\n";
					//result.code += "$ctl[\""+ nodeName.substr(jst_attr_prefix.length) + "\"] = function() { event.target['onclick_fnc']($data); };\n";
					result.code += "$ctl[\""+ nodeName.substr(jst_attr_prefix.length) + "\"] = "+ nodeValue +";\n";
					node.removeAttribute(nodeName);
				}
			}
			return true;
		}
	});
	
	directives.push({
		name: "*",
		compile: function($jst, node, result, seq) {
			var i, attrs=get_attribute_names(node), nodeName, nodeValue;
			for(i=0; i < attrs.length; ++i){
				nodeName = attrs[i];
				if(directive.processorOf(nodeName) === undefined){
					nodeValue = "" + node.getAttribute(nodeName);
					if(nodeValue && nodeValue.match(REGEX_EXPRESSION)){
						result.code += "$ctx.set_attribute($ctl, \"" + ((nodeName.indexOf(jst_attr_prefix)==0)? nodeName.substr(jst_attr_prefix.length) : nodeName) + "\", " + expression.as_string(nodeValue) + ");\n";
						node.removeAttribute(nodeName);
					}
				}
			}
			return true;
		}
	});
	
	directives.push({
		name: "call",
		compile: function($jst, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + this.name);
			return true;
		}
	});

	directives.push({
		name: "purge",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				if(expression.test("if(?){}", nodeValue)){
					result.code = "$ctx.recursive=" + nodeValue + ";if($ctx.recursive)"; 
				}
				result.code += "{$ctx.ensure_node($ctl, "+seq+");}else{$ctx.comment_inner($ctl, "+seq+");}"
			}
			return true;
		}
	});
	
	directives.push({
		name: "recursive",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + this.name;
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				if(expression.test("if(?){}", nodeValue)){
					result.code = "$ctx.recursive = " + nodeValue+";";
				}
				node.removeAttribute(nodeName);
			}
			return true;
		}
	});
	
	directives.push({
		name: "item-end"
	});
	directives.push({
		name: "end"
	});
	directives.push({
		name: "id-*"
	});

	function compile($jst, target, options){
		var i, result, skip, directive, seq, code = "", subcode, span, txt, node=target.childNodes[0];
		
		while(node){
			if(node.nodeType == 3) {
				result = node.nextSibling;
				txt = get_node_text(node, options.preserveWhiteSpace);
				var elm = document.createElement("div");
				if(txt.length > 0) {
					expression.split(txt, function(s){
							++ $jst.seq;
							seq = $jst.seq;
						if(options.wrapText){
							code += "$ctl = $ctx.push_node($ctl, " + $jst.seq + ");$ctx.recursive=false;$ctl.innerText=" + expression.as_value(s) + ";$ctl = $ctx.pop_node($ctl);\n";
							span = elm.appendChild(document.createElement("span"));
							span.setAttribute($jst.id, seq);
						}else{
							code += "$ctl = $ctx.push_node($ctl, " + $jst.seq + ");$ctx.recursive=false;$ctl=$ctx.set_text($ctl, " + seq + ", " + expression.as_value(s) + ");$ctl = $ctx.pop_node($ctl);\n";
							elm.appendChild(document.createComment($jst.id + "=" + seq));
							elm.appendChild(document.createComment("text:end"));
						}
						return s;
					}, function(s){
						elm.appendChild(document.createTextNode(s));
						return s;
					})			
					while(elm.childNodes.length > 0) {
						node.parentNode.insertBefore(elm.firstChild, node);
					}
				}
				node.parentNode.removeChild(node);
				node = result;
				continue;
			}
			if(node.nodeType == 8) {
				result = node.nextSibling;
				node.parentNode.removeChild(node);
				node = result;
				continue;
			}
			if(node.nodeType == 1 && node_contains_directive(node)){
				++ $jst.seq;
				seq = $jst.seq;
				$jst.nodes[seq] = {};
				node.setAttribute($jst.id, seq);
				code += "$ctl = $ctx.push_node($ctl, " + $jst.seq + ");\n";
				for(i=0, skip = false; i < directives.length; ++ i){
					directive = directives[i];
					if(directive.compile){
						result = {code: "", recursive : true};
						skip = !directive.compile.call(directive, $jst, node, result, seq);
						code += result.code;
					}
					if(skip){
						++ i;
						break;
					}
				}
				if(result.recursive){
					subcode = compile($jst, node, options);
					if(subcode != ""){
						code +=	"if($ctx.recursive){\n" + subcode + "\n}\n";
					}
				}
				
				for(--i; i >= 0; -- i){
					directive = directives[i];
					if(directive.cleanup){
						result = {code: ""};
						directive.cleanup.call(directive, $jst, node, result, seq);
						code += result.code;
					}
				}
				code += "\n$ctl = $ctx.pop_node($ctl);\n";
				$jst.nodes[seq].dom = node;
			}else if(node.nodeType == 1){
				code +=	compile($jst, node, options);
			}
			if(node){
				node = node.nextSibling;
			}
		}
		return code;
	}
	
	var option = {
		preserveWhiteSpace: false,
		wrapText: false
	};
	
	function domOf(template) {
		var t = template, dom = template;
		if(typeof(template) == "string"){
			dom = document.getElementById(template);
			if(dom == null){
				dom = document.createElement("div");
				dom.innerHTML = template;
			}
		}
		return dom.cloneNode(true);
	}

	function init($jst, template, target, options){
		var k, elm = domOf(template);
		options = options || {};
		for(var key in option){
			if(options[key] === undefined){
				options[key] = option[key];
			}
		}
		
		$jst.seq=0;
		$jst.id = jst_attr_prefix + "id-" + uuid(8);
		$jst.nodes = [];
		$jst.code = compile($jst, elm, options);
		
		var body = "var $ctl=$target, $ctx={ctls:[]\n";
		$jst.cache = body;
		var value = "";
		for(k in stock_functions){
			value = stock_functions[k];
			if(typeof(value) == "function"){
				value = value.toString();
			}else if(typeof(value) == "string"){
				value = "\"" + strconv(value, str_escape_ary) + "\"";
			}else if(typeof(tvalue) == "number"){

			}else if(typeof(value) == "object"){
				value = JSON.stringify(value);
			}else{
				value = "undefined";
			}
			body = body + "," + k + " : " + value;
		}
		body += "};\n";
		
		body += "with($data){\n" + $jst.code + "}";
		
		$jst.proc = Function("$jst", "$target", "$data", body);
		$jst.nodes[0] = {dom : elm};
		$jst.target = typeof(target)=="string"? document.getElementById(target) : target;
		$jst.rendered = false;
		console.log($jst);
		console.log(body);
	}
	
	function render(data, refresh) {
		this.dirty = false;
		if(refresh || this.rendered == false) {
			while(this.target.hasChildNodes()) {  
        		this.target.removeChild(this.target.firstChild);  
    		} 		
			var n = this.nodes[0].dom.firstChild;
			while(n){
				var nxt = n.nextSibling;
				this.target.appendChild(n.cloneNode(true));
				n = nxt;
			}
			this.rendered = true;
		}	
		this.proc(this, this.target, data);
	}
	var jst = function(name, dom, options) {
		init(this, name, dom, options);
	}
	
	jst.prototype.render = render;
	if(Object.defineProperty && window.EventTarget){
		var observe_exceptions = [EventTarget, Navigator, Screen, History, Location, RegExp];
		function observeProperty(obj, k, callback) {
			var old = obj[k];
			if(observe_exceptions.find(function(e){return old instanceof e}) == undefined){
				Object.defineProperty(obj, k, {
				    enumerable: true,
				    configurable: true,
				    get: function() {
				     	return old;
				    },
				    set: function(now) {
				      	if(now !== old) {
				        	old = now;
				        	observe(old, callback);
							callback();
				      	}
				    }
				});
				observe(old, callback);
			}
		}
		function observeArray(arr, callback) {
			for (var i = 0, l = arr.length; i < l; i++) {
	    		observe(arr[i], callback);
	  		}
			if(arr.isObservable){
				arr.isObservable = true;
				var oam = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
				var arrayProto = Array.prototype;
			 	var hackProto = Object.create(Array.prototype);
			  	oam.forEach(function(method){
			    	hackProto.method = function() {
							var me = this;
							//TODO: observe item
							var result = arrayProto[method].apply(me, Array.prototype.slice.call(arguments));
							callback();
							return  result;
			      }
			  	});
			  	arr.item = function(i, v){
			  		if(arr[i] != v){
			  			observe(v, callback);
						arr[i] = v;
						callback();
			  		}
			  	};
				arr.__proto__ = hackProto;
			}
		}
		function observe(obj, callback) {
			if(Object.prototype.toString.call(obj) === '[object Array]') {
	      		observeArray(obj, callback);
	    	} else if (obj.toString() === '[object Object]') {
	      		Object.keys(obj).forEach(function(key){
	      			if(typeof(obj[key]) != "function"){
		    			observeProperty(obj, key, callback);
	      			}
	  			});
	    	}
		}
		
		function watch(data){
			this.data = data;
			var $jst = this;
			var callback = function(){
				if(!$jst.dirty){
					$jst.dirty = true;
					setTimeout(function(){
						$jst.render(data);		
					}, 30);
				}
			}
			observe(data, callback);
	 	}
		jst.prototype.watch = watch;
	}
		
	jst.set_data = function(node, name, value){
		node["@" + name] = value;
	}
	
	jst.get_data = function(node, name){
		return node["@" + name];
	}
	
	jst.get_bind_obj = function(node){
		return jst.get_data(node,"@bind-obj");
	}
	
	jst.get_bind_key = function(node){
		return jst.get_data(node, "@bind-key");
	}
	
	jst.stock_functions = stock_functions = {
		"pop_node" : function(ctl){
			$ctx.lastCtl = ctl;
			return $ctx.ctls.pop();
		},		
		"push_node" : function($ctl, seq){
			$ctx.recursive=true;
			$ctx.ctls.push($ctl);
			var result = null, recursive = function (n){
					if(n.getAttribute($jst.id) == seq){
						result = n;
						return n;
					}
					n = n.firstChild;
					while(n && result == null){
						if(n.nodeType == 1){
							recursive(n);
						}else if(n.nodeType == 8){
							if(n.data == ($jst.id + "=" + seq)){
								result = n;
								return n;
							}
						}
						n = n.nextSibling;
					}
					return result;
				},
				counter_recursive = function(n){
					var node, parent = n.parentNode, n = n.nextSibling;
					while(n && result == null){
						if(n.nodeType == 8 && n.data == ($jst.id + "=" + seq)){
							result = n;
							return n;
						}else if(n.nodeType == 1){
							node = recursive(n);
							if(node != null){
								return node;
							}
						}
						n = n.nextSibling;
					}
					while(result == null && parent != $target){
						counter_recursive(parent);
					}
					return result;
				};
			if($ctx.lastCtl==null){
				return recursive($ctl);
			}else{
				return counter_recursive($ctx.lastCtl);
			}
		},
		"set_text" : function(node, seq, txt){
			var next = node.nextSibling;
			if (node.nodeType != 8 || next == null) return node;
			if (next.nodeType == 8 && next.data == "text:end" && txt !== ""){
				node = node.parentNode.insertBefore(document.createTextNode(txt), next);
				return node;
			}
			var afternext = next.nextSibling;
			if (next.nodeType == 3 && afternext &&  afternext.nodeType == 8 && afternext.data == "text:end" && next.data !== txt){
				next.data = txt;
				return next;
			}
			return node;
		},
		"create_node" : function(seq){
			return $jst.nodes[seq].dom.cloneNode(true);
		},
		"comment_inner" : function(node, seq){
			if(node.nodeType == 1 && node.getAttribute($jst.id) == seq){
				if(!(node.childNodes.length==1 && node.firstChild.nodeType==8 && node.firstChild.data == "jst-seq="+ seq)){
					while(node.hasChildNodes()){node.removeChild(node.firstChild);}
					node.appendChild(document.createComment("jst-seq="+seq));
				}
			}
			return node;
		}, 
		"clone_child"  : function(node, dom){
			var nxt, n = dom.firstChild;
			while(node.hasChildNodes()){node.removeChild(node.firstChild);}
			while(n){
				nxt = n.nextSibling;
				node.appendChild(n.cloneNode(true));
				n = nxt;
			}
		},
		"ensure_node" : function(node, seq){
			$ctx.recursive=true;
			$ctx.lastCtl = null;
			if(node.nodeType == 8 && node.data == $jst.id+"="+seq){
				var result =  $ctx.create_node(seq);
				node.parentNode.replaceChild(result, node);
				return result;
			}
			if(node.nodeType == 1 && node.getAttribute($jst.id) == seq){
				if(node.childNodes.length==1 && node.firstChild.nodeType==8 && node.firstChild.data == "jst-seq="+ seq){
					$ctx.clone_child(node, $jst.nodes[seq].dom);
				}
				return node;
			}
			return node.parentNode.insertBefore($ctx.create_node(seq), node);
		},
		"cleanup_node" : function(node, seq){
			if(node.previousSibling && node.previousSibling.nodeType==1 && node.previousSibling.getAttribute($jst.id) == seq){
				node = node.previousSibling; 
				$ctx.remove_node(node, seq);
			}else{
				node = $ctx.comment_node(node, seq);
			}
			return node;
		},
		"remove_node" : function(node, seq){
			var result = node, node = result.nextSibling;
			while(node){
				if(node.nodeType == 1 && node.getAttribute($jst.id) == seq){
					n = node;
					node = node.nextSibling;
					n.parentNode.removeChild(n);
					continue;
				}
				break;
			}
			return result;
		},
		"comment_node" : function(node, seq){
			var n, result = document.createComment($jst.id+"="+seq);
			node.parentNode.replaceChild(result, node);
			$ctx.remove_node(result, seq);
			return result;
		},
		"next_node" : function(node, seq){
			return node.nextSibling? node.nextSibling : node.parentNode.appendChild($ctx.create_node(seq));
		},
		"special_attributes" : {
			"input": ["disabled", "readonly", "checked", "required"],
			"textarea": ["disabled", "readonly"],
			"select": ["disabled", "readonly", "multiple"],
			"button": ["disabled"],
			"link": ["disabled"],
			"style": ["disabled"],
			"option": ["selected"],
			"img": ["ismap"],
			"td": ["nowrap"],
			"th": ["nowrap"]
		},
		"set_attribute" : function(node, name, value){
			var tagName = node.nodeName.toLocaleLowerCase();
			if ($ctx.special_attributes[tagName] &&
				$ctx.special_attributes[tagName].indexOf(name) >= 0 && (value === false || value === "false" || value === 0)) {
				node.removeAttribute(name);
			} else {
				if(node.getAttribute(name) != value) {
					node.setAttribute(name, value);
				}
			}
			if(name.toLocaleLowerCase() == "class") {
				node.className= value;
			}
			if(name.toLocaleLowerCase() == "style") {
				node.style.cssText = value;
			}
			if(name.toLocaleLowerCase() == "value" && tagName == "input") {
				node.value = value;
			}
		},
		"set_data" : jst.set_data
	};
	
	jst.prefix = jst_attr_prefix;

	jst.directive = directive;

	if(typeof module === "object" && module && typeof module.exports === "object") {
		module.exports = jst;
	} else {
		window.jst = jst;
		if(typeof define === "function" && define.amd) {
			define("jst", [], function() { return jst; });
		}
		if(typeof define === "function" && typeof seajs == "object") {
			define("jst", function(require, exports, module) {
				module.exports = window.jst = jst;
			});
		}
	}
})();
