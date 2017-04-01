(function(){
	var REGEX_EXPRESSION = /\{\{(.+?)\}\}/g,
		directives = [], stock_functions = {},
		jst_attr_prefix = window.jst_jst_attr_prefix || "jst-",
		str_escape_ary = [ [/\\/g, "\\\\"], [/\"/g, "\\\""], [/\t/g, "\\t"], [/\r/g, "\\r"],[/\n/g, "\\n"],],
		strconv = function(str, ary){ary.every(function(v, i){str = str.replace(v[0], v[1]);return true;});return str;},
		uuid = function(len) {
		    var i, s = [], digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
			len = len? len : 16;
		    
		    for(i = 0; i < len; i++) {
		        s[i] = digits.substr(Math.floor(Math.random() * 62), 1);
		    }
		    return s.join("");
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
			safe_get : function(s){
				return "function(){try{return "+ s +"; }catch(err){return ''}}()";
			},
			as_string : function(expr){
				return expression.split(expr, function(s){
					return expression.safe_get(s);
				}, function(s){
					return "\"" + strconv(s, str_escape_ary) + "\"";
				}).join("+");
			},
			test: function(syntax, value){
				var f = new Function(syntax.replace(/\?/g, value));
				return true;
			}
		},
		match_directive = function(name, nodeName){
			return (name != "*") && ((name == nodeName) || (name.match(/\*$/g) && nodeName.indexOf(name.substr(0, name.length-1))==0));
		},
		find_directive = function(nodeName){
			return directives.find(function(e){return match_directive(e.name, nodeName);});
		},		
		get_attribute_names = function(node){
			var i = 0;attrs = [];
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
		};
	
	directives.push({
		name: jst_attr_prefix + "skip",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "skip";
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				result.recursive = false;
				var i, attrs=get_attribute_names(node);
				for(i = 0; i < attrs.length; ++ i){
					nodeName = attrs[i];
					if(find_directive(nodeName) !== undefined){
						node.removeAttribute(nodeName);
					}
				}
				return false;
			}
			return true;
		}
	});

	directives.push({
		name: jst_attr_prefix + "begin",
		compile: function($jst, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "begin");
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "end");
		}
	});
	directives.push({
		name: jst_attr_prefix + "if",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "if";
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				if(expression.test("if(?){}", nodeValue)){
					result.code = "if(" + nodeValue + "){\n$ctl=ensure_node($ctl, "+seq+");\n";
				}
			}
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			var nodeName = jst_attr_prefix + "if";
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				result.code = "}else{$ctl = comment_node($ctl, "+seq+");}";
				node.removeAttribute(nodeName);	
			}
		}
	});
	directives.push({
		name: jst_attr_prefix + "repeat",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "repeat";
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
				result.code += "\n$ctl=ensure_node($ctl, "+seq+");\n";
			}
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			var nodeName=jst_attr_prefix + "repeat", nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				result.code = "\n$ctl = next_node($ctl, "+seq+");\n";
				nodeName = jst_attr_prefix + "filter";
				nodeValue = node.getAttribute(nodeName);
				if(nodeValue != null){
					result.code += "}\n";
					node.removeAttribute(nodeName);	
				}
				result.code += "}\n";
				result.code += "$ctl = cleanup_node($ctl, "+seq+");\n";
				node.removeAttribute(jst_attr_prefix + "repeat");	
			}
		}
	});	
	
	directives.push({
		name: jst_attr_prefix + "filter"	
	});
	
	directives.push({
		name: jst_attr_prefix + "item-begin",
		compile: function($jst, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "item-begin");
			return true;
		},
		cleanup: function($ctx, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "item-end");
			return true;
		}		
	});	

	directives.push({
		name: jst_attr_prefix + "html",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "html";
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
		name: jst_attr_prefix + "text",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "text";
			var nodeValue= node.getAttribute(nodeName);
			if(nodeValue != null){
				result.code = "$ctl.innerText=" + expression.as_string(nodeValue) + ";\n";
				node.removeAttribute(nodeName); 
			}
			return true;
		}
	});		
	
	directives.push({
		name: jst_attr_prefix + "bind",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "bind";
			var nodeValue= node.getAttribute(nodeName);
			if(nodeValue!=null){
				var bind = nodeValue.split("@");
				var obj = bind[0] || "$data", key = bind[1];
				if(expression.test("var x= ?;", obj)){
					result.code += "set_data($ctl, \"@bind-obj\", " + obj + ");\n";
					result.code += "set_data($ctl, \"@bind-key\", " + expression.as_string(key) + ");\n";
				}
				node.removeAttribute(nodeName);
			}
			return true;
		}
	});	

	directives.push({
		name: jst_attr_prefix + "data-*",
		compile: function($jst, node, result, seq) {
			var i, attrs=get_attribute_names(node), nodeName, nodeValue;
			for(i=0; i < attrs.length; ++i){
				nodeName = attrs[i];
				if(nodeName.indexOf(jst_attr_prefix + "data-") == 0){
					nodeValue = node.getAttribute(nodeName);
					if(expression.test("var x = ?;", nodeValue)){
						result.code += "set_data($ctl, \"" + nodeName.substr(jst_attr_prefix.length+5) + "\" , " + nodeValue + ");\n";
						node.removeAttribute(nodeName);
					}
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
				if(find_directive(nodeName) === undefined){
					nodeValue = "" + node.getAttribute(nodeName);
					if(nodeValue && nodeValue.match(REGEX_EXPRESSION)){
						result.code += "set_attribute($ctl, \"" + ((nodeName.indexOf(jst_attr_prefix)==0)? nodeName.substr(jst_attr_prefix.length) : nodeName) + "\", " + expression.as_string(nodeValue) + ");\n";
						node.removeAttribute(nodeName);
					}
				}
			}
			return true;
		}
	});
	
	directives.push({
		name: jst_attr_prefix + "call",
		compile: function($jst, node, result, seq) {
			result.code = compile_as_call(node, jst_attr_prefix + "call");
			return true;
		}
	});

	directives.push({
		name: jst_attr_prefix + "purge",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "purge";
			var nodeValue = node.getAttribute(nodeName);
			if(nodeValue != null){
				if(expression.test("if(?){}", nodeValue)){
					result.code = "$ctx.recursive=" + nodeValue + ";if($ctx.recursive)"; 
				}
				result.code += "{ensure_node($ctl, "+seq+");}else{comment_inner($ctl, "+seq+");}"
			}
			return true;
		}
	});
	
	directives.push({
		name: jst_attr_prefix + "recursive",
		compile: function($jst, node, result, seq) {
			var nodeName = jst_attr_prefix + "recursive";
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
		name: jst_attr_prefix + "item-end"
	});
	directives.push({
		name: jst_attr_prefix + "end"
	});
	directives.push({
		name: jst_attr_prefix + "id"
	});

	function node_contains_directive(node){
		var attr = get_attribute_names(node);
		for(var i=0;i<attr.length; ++i){
			if(find_directive(attr[i]) != undefined || ("" + node.getAttribute(attr[i])).match(REGEX_EXPRESSION)){
				return true;
			}
		}
		return false;
	}
	
	function get_node_text(node, preserveWhiteSpace){
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
	}

	function compile($jst, target, preserveWhiteSpace){
		var i, result, skip, directive, seq, code = "", subcode, node=target.childNodes[0];
		
		while(node){
			if(node.nodeType == 3) {
				result = node.nextSibling;
				txt = get_node_text(node, preserveWhiteSpace);
				var elm = document.createElement("div");
				if(txt.length > 0) {
					expression.split(txt, function(s){
						++ $jst.seq;
						seq = $jst.seq;
						code += "$ctl = push_node($ctl, " + $jst.seq + ");$ctl=set_text($ctl, " + seq + ", " + expression.safe_get(s) + ");$ctl = pop_node($ctl);\n";
						elm.appendChild(document.createComment($jst.id + "=" + seq));
						elm.appendChild(document.createComment("text:end"));
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
				node.parentElement.removeChild(node);
				node = result;
				continue;
			}
			if(node.nodeType == 1 && node_contains_directive(node)){
				++ $jst.seq;
				seq = $jst.seq;
				$jst.nodes[seq] = {};
				node.setAttribute($jst.id, seq);
				code += "$ctl = push_node($ctl, " + $jst.seq + ");$ctx.recursive=true;\n";
				for(i=0, skip = false; i < directives.length; ++ i){
					directive = directives[i];
					if(directive.compile){
						result = {code: "", recursive : true};
						skip = !directive.compile($jst, node, result, seq);
						code += result.code;
					}
					if(skip){
						++ i;
						break;
					}
				}
				if(result.recursive){
					subcode = compile($jst, node, preserveWhiteSpace);
					if(subcode != ""){
						code +=	"if($ctx.recursive){\n" + subcode + "\n}\n";
					}
				}
				
				for(--i; i >= 0; -- i){
					directive = directives[i];
					if(directive.cleanup){
						result = {code: ""};
						directive.cleanup($jst, node, result, seq);
						code += result.code;
					}
				}
				code += "\n$ctl = pop_node($ctl);\n";
				$jst.nodes[seq].dom = node;
			}else if(node.nodeType == 1){
				code +=	compile($jst, node, preserveWhiteSpace);
			}
			if(node){
				node = node.nextSibling;
			}
		}
		return code;
	}
	
	function init($jst, template, target, preserveWhiteSpace){
		var tmpl = template, elm;
		if(typeof(tmpl)=="string" && (tmpl = document.getElementById(template)) == null){
			tmpl = document.createElement("div");
			tmpl.innerHTML = template;
		}
		elm = tmpl.cloneNode(true);
		preserveWhiteSpace = (preserveWhiteSpace === undefined || preserveWhiteSpace === "false" || preserveWhiteSpace === 0 || preserveWhiteSpace === false) ? false : true
		
		$jst.seq=0;
		$jst.id = jst_attr_prefix + "id-" + uuid(8);
		$jst.nodes = [];
		$jst.code = compile($jst, elm, preserveWhiteSpace);
		$jst.nodes[0] = {dom : elm};
		$jst.target = typeof(target)=="string"? document.getElementById(target) : target;
		$jst.rendered = false;
		console.log($jst);
	}
	
	function render(data, refresh) {
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
		var body = "var $ctx = {ctls:[]}, $ctl = $target, $emptyNode = document.createElement('div')\n";
		for(var k in data){
			body = body + "," + k + "=$data['" + k + "']\n";
		}
		if(this.cache != body){
			//console.log("recompile");
			this.cache = body;
			for(k in stock_functions){
				body = body + "," + k + "=" + stock_functions[k].toString();
			}
			body += ";\n" + this.code;
			//console.log(body);
			this.renderproc = Function("$jst", "$target", "$data", body);
		}
		this.dirty = false;
		this.renderproc(this, this.target, data);
	}
	var jst = function(name, dom, preserveWhiteSpace) {
		init(this, name, dom, preserveWhiteSpace);
	}
	
	jst.prototype.render = render;
		if(Object.defineProperty && window.Document && window.HTMLElement){
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
			    	Object.defineProperty(hackProto, method, {
			    		writable: true,
			    		enumerable: true,
			   			configurable: true,
						value: function() {
							var me = this;
							//TODO: observe item
							var result = arrayProto[method].apply(me, Array.prototype.slice.call(arguments));
							callback();
							return  result;
			      		}
			    	})
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
		
		var observe_exceptions = [Document, HTMLElement, Event, Window, Navigator, Screen, History, Location, RegExp];
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
			$jst = this;
			callback = function(){
				if(!$jst.dirty){
					$jst.dirty = true;
					setTimeout(function(){
						$jst.render(data);		
					}, 100);
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
			$ctx.ctls.push($ctl);
			var recursive = function (n){
					if(n.getAttribute($jst.id) == seq){
						return n;
					}
					n = n.firstChild;
					while(n){
						if(n.nodeType == 1){
							return recursive(n);
						}else if(n.nodeType == 8){
							if(n.data == ($jst.id + "=" + seq)){
								return n;
							}
						}
						n = n.nextSibling;
					}
				},
				counter_recursive = function(n){
					if(n == $target){
						return null;
					}
					var node, parent = n.parentNode, n = n.nextSibling;
					while(n){
						if(n.nodeType == 8 && n.data == ($jst.id + "=" + seq)){
								return n;
						}else if(n.nodeType == 1){
							node = recursive(n);
							if(node != null){
								return node;
							}
						}
						n = n.nextSibling;
					}
					return counter_recursive(parent);
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
				next.data == txt;
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
//		"ensure_inner" : function(node, seq){
//			$ctx.lastCtl = null;
//			if(node.nodeType == 1 && node.getAttribute($jst.id) == seq){
//				if(node.childNodes.length==1 && node.firstChild.nodeType==8 && node.firstChild.data == "jst-seq="+ seq){
//					clone_child(node, $jst.nodes[seq].dom);
//				}
//				return node;
//			}
//			return null;
//		},
		"ensure_node" : function(node, seq){
			$ctx.lastCtl = null;
			if(node.nodeType == 8 && node.data == $jst.id+"="+seq){
				var result =  create_node(seq);
				node.parentNode.replaceChild(result, node);
				return result;
			}
			if(node.nodeType == 1 && node.getAttribute($jst.id) == seq){
				if(node.childNodes.length==1 && node.firstChild.nodeType==8 && node.firstChild.data == "jst-seq="+ seq){
					clone_child(node, $jst.nodes[seq].dom);
				}
				return node;
			}
			return node.parentNode.insertBefore(create_node(seq), node);
		},
		"cleanup_node" : function(node, seq){
			if(node.previousSibling && node.previousSibling.nodeType==1 && node.previousSibling.getAttribute($jst.id) == seq){
				node = node.previousSibling; 
				remove_node(node, seq);
			}else{
				node = comment_node(node, seq);
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
			remove_node(result, seq);
			return result;
		},
		"next_node" : function(node, seq){
			return node.nextSibling? node.nextSibling : node.parentNode.appendChild(create_node(seq));
		},
		"set_attribute" : function(node, name, value){
			var tagName = node.nodeName.toLocaleLowerCase();
			if(jst.special_attributes[tagName] &&
				jst.special_attributes[tagName].indexOf(name) >= 0 && (value === false || value === "false" || value === 0)) {
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

	jst.special_attributes = {
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
	};
	
	jst.directives = {
		insert : function(directive, name){
			var n = directives.findIndex(function(e){return e.name == jst_attr_prefix + name});
			if(n >= 0){
				directives.splice(n, 0, directive);
			}
		},
		remove: function(name){
			var n = directives.findIndex(function(e){return e.name == jst_attr_prefix + name});
			if(n >= 0){
				directives.splice(n,1);
			}
		},
		indexOf : function(name){
			return directives.findIndex(function(e){return e.name == jst_attr_prefix + name});
		},
		find : function(name){
			return directives.find(function(e){return e.name == jst_attr_prefix + name});
		}
	}
	
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
