(function(){
	var jst_attr_prefix    = window.jst_jst_attr_prefix || "jst-";

	var jst = function(name, dom, preserveWhiteSpace){
		init(this, name, dom, preserveWhiteSpace);	
	}
	
	jst.attrs = {};
	var jst_attr_skip      = jst.attrs.skip      = jst_attr_prefix + "skip";
	var jst_attr_begin     = jst.attrs.begin     = jst_attr_prefix + "begin";
	var jst_attr_if        = jst.attrs.if        = jst_attr_prefix + "if"; 
	var jst_attr_case      = jst.attrs.case      = jst_attr_prefix + "case";
	var jst_attr_loop      = jst.attrs.loop      = jst_attr_prefix + "loop";
	var jst_attr_repeat    = jst.attrs.repeat    = jst_attr_prefix + "repeat";
	var jst_attr_filter    = jst.attrs.filter    = jst_attr_prefix + "filter";
	var jst_attr_html      = jst.attrs.html      = jst_attr_prefix + "html";
	var jst_attr_text      = jst.attrs.text      = jst_attr_prefix + "text";
	var jst_attr_bind      = jst.attrs.bind      = jst_attr_prefix + "bind";
	var jst_attr_call      = jst.attrs.call      = jst_attr_prefix + "call";
	var jst_attr_recursive = jst.attrs.recursive = jst_attr_prefix + "recursive";
	var jst_attr_end       = jst.attrs.end       = jst_attr_prefix + "end";

	jst.pre_process_attributes = [
		{ name: jst_attr_skip,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	return $ctl.nextSibling;
		  }
		},
		{ name: jst_attr_begin,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	return execute($ctx, node, seq, nodeName, nodeValue, exec_call_function);
		  }
		},
		{ name: jst_attr_if,
		  process: function($ctx, node, seq, nodeName, nodeValue){
	  		var value = execute($ctx, node, seq, nodeName, nodeValue, exec_value_function);
	  		if(!value){
				return jst.node.comment($jst.id, node);
		  	}
		  	return node;
		  }
		},
		{ name: jst_attr_repeat,
		  process: function($ctx, node, seq, nodeName, nodeValue){  
			return execute($ctx, node, seq, nodeName, nodeValue, exec_repeat_function);
		  }
		},
		{ name: jst_attr_loop,
		  process: function($ctx, node, seq, nodeName, nodeValue){  
		  	return node;
		  }
		},
		{ name: jst_attr_filter,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	var value = execute($ctx, node, seq, nodeName, nodeValue, exec_value_function);
	  		if(!value){
				return jst.node.comment($jst.id, node);
		  	}
		  	return node;
		  }
		},
		{ name: jst_attr_case,
		  process: function($ctx, node, seq, nodeName, nodeValue){
	  		var value = execute($ctx, node, seq, nodeName, nodeValue, exec_value_function);
	  		var comment = "<!--" + jst_attr_case + "@" + $ctx.$jst.id + "=" + seq + "-->";
	  		if(!value){
	  			node.innerHTML = comment;
	  		}else{
	  			if(node.innerHTML == comment){
	  				node.innerHTML = $ctx.$jst.nodes[seq].dom.innerHTML;
	  			}
	  		}
		  	return node;
		  }
		},
		{ name: jst_attr_html,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	var value = execute($ctx, node, seq, nodeName, nodeValue, exec_value_function);
		  	if(value === undefined || value === null){
		  		value = "";
		  	}
		  	node.innerHTML = value;
		  	return node;
		  }
		},
		{ name: jst_attr_text,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	var value = execute($ctx, node, seq, nodeName, nodeValue, exec_value_function);
		  	if(value === undefined || value === null){
		  		value = "";
		  	}
		  	node.innerText = value;
		  	return node;
		  },
		},
		{ name: "*",
		  process: function($ctx, node, seq, nodeName, nodeValue){
			if(nodeValue.match(/\{\{.+?\}\}/g)){
				nodeValue = nodeValue.replace(/\{\{.+?\}\}/g, function(expr){
				  	var value = execute($ctx, node, seq, nodeName, expr, exec_value_function);
				  	if(value === undefined || value === null){
				  		value = "";
				  	}
					return value;
				});
				jst.node.attr(node, nodeName, nodeValue)
			}
		  	return node;
		  },
		},
		{ name: jst_attr_bind,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	var value = execute($ctx, node, seq, nodeName, nodeValue, exec_bind_function);
		  	if(!value.fnc){
		  		value.fnc = exec_bind;
		  	}
		  	value.fnc($ctx, node, value.obj, value.key);
		  	
		  	return node;
		  },
		},
		{ name: jst_attr_call,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	return execute($ctx, node, seq, nodeName, nodeValue, exec_call_function);
		  },
		},
		{ name: jst_attr_recursive,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	var value = execute($ctx, node, seq, nodeName, nodeValue, exec_value_function);
	  		if(!value){
			  	return $ctl.nextSibling;
	  		}
		  	return $ctl;
		  }
		},
	];
	
	jst.post_process_attributes = [
		{ name: jst_attr_end,
		  process: function($ctx, node, seq, nodeName, nodeValue){
		  	return execute($ctx, node, seq, nodeName, nodeValue, exec_call_function);
		  }
		}
	];
	
	var special_attributes = {
		"input"   : ["disabled","readonly","checked","required"], 
		"textarea": ["disabled","readonly"],
		"select"  : ["disabled","readonly","multiple"], 
		"button"  : ["disabled"],
		"link"    : ["disabled"], 
		"style"   : ["disabled"], 
		"option"  : ["selected"], 
		"img"     : ["ismap"], 
		"td"      : ["nowrap"],
		"th"      : ["nowrap"]
	};
	
	function create_vm_function(func, rep){
		var txt = func.toString();
		var args = txt.substring(txt.indexOf("(") + 1, txt.indexOf(")")).replace(/\s/g, "").split(",");
		var body = txt.substring(txt.indexOf("{") + 1, txt.lastIndexOf("}"));
		for(expr in rep){
			body = body.replace(new RegExp(expr), rep[expr]);
		}
		args.push(body);
		
		return Function.apply(this, args);
	}
		
	/* evaluation call function */
	function exec_call_function($ctx, $ctl){
		try{
			var $data = $ctx.$data, $jst = $ctx.$jst, $data = $ctx.$data;
			with($data){
				$expr;
				return $ctl;
			}
		}catch(err){
			console.log(err);
			return undefined;
		}
	}
	exec_call_function.create = function(expr){
		return create_vm_function(exec_call_function, {"\\$expr" : expr});
	}

	/* evaluation value function */
	function exec_value_function($ctx, $ctl){
		try{
			var $jst = $ctx.$jst, $target = $ctx.$target, $data = $ctx.$data;
			with($data){
				return $expr;
			}
		}catch(err){
			console.log(err);
			return undefined;
		}
	}
	exec_value_function.create = function(expr){
		return create_vm_function(exec_value_function, {"\\$expr" : expr});
	}
	
	/* evaluation repeat function */
	function exec_repeat_function($ctx, $ctl){
		try{
			var $jst = $ctx.$jst, $target = $ctx.$target, $data = $ctx.$data;
			var result = 0, node = $ctl, parent = $ctl.parentNode, seq = $ctl.getAttribute($jst.id), orgnode;
			with($data){
				$for($expr) 
				{
					if(!node){
						node = parent.appendChild(jst.node.create($jst.nodes[seq].dom));
					}
					if(node.getAttribute($jst.id)  != seq){
						node = parent.insertBefore(jst.node.create($jst.nodes[seq].dom), node);
					}
					orgnode = node;
					node = jst.process_attrbutes($ctx, node, 0, [jst.attrs.if, jst.attrs.case,jst.attrs.repeat, jst.attrs.loop]);
					if(node.nodeType == 8){
						node = parent.insertBefore(jst.node.create($jst.nodes[seq].dom), node);
						node.parentNode.removeChild(node.nextSibling);
					} else {
						if(node != orgnode){
							console.error("context changed in loop context");
						}else{
							jst.process($ctx, node);
							jst.process_attrbutes($ctx, node, 1, []);
							node = node.nextSibling;
						}
						++ result;
					}
				}
				if(result == 0){
					node = jst.node.comment($jst.id, node).nextSibling;
			  	}
		  		var next;
		  		while(node && node.nodeType == 1 && node.getAttribute($jst.id) == seq){
		  			next = node.nextSibling;
		  			node.parentNode.removeChild(node);
		  			node = next;
		  		}
			  	return node;
			}
		}catch(err){
			console.log(err);
			return false;
		}
		return result > 0? node : false;
	}
	exec_repeat_function.create = function(expr){
		return create_vm_function(exec_repeat_function, {"\\$for" : "for", "\\$expr" : expr});
	}
	
	/* evaluation bind function */
	function exec_bind_function($ctx, $ctl){
		try{
			var $jst = $ctx.$jst, $target = $ctx.$target, $data = $ctx.$data;
			with($data){
				return {obj: $obj, key: $key};
			}
		}catch(err){
			console.log(err);
			return undefined;
		}
	}
	exec_bind_function.create = function(expr){
		var obj, key = expr.match(/\[.+\]$/g);
		if(key){
			obj = expr.substr(0, expr.lastIndexOf("["));
			key = key[0].substr(1, key[0].length-2);
		}else{
			var n = expr.lastIndexOf("."); 
			if(n < 0){
				obj = '$data';
				key = expr;
			}else{
				var obj = expr.substr(0, n -1);
				var key = expr.substr(n+1);
			}
		}
		if(!key.match(/^\d+$/g)){
			key = "\"" + expr.replace(/\"/g, "\\\"") + "\"";
		}
		return create_vm_function(exec_bind_function, {"\\$obj" : obj, "\\$key" : key});
	}
	
	function exec_bind($ctx, $ctl, obj, prop){
		var $jst = $ctx.$jst, $target = $ctx.$target, $data = $ctx.$data;
		if($ctl.jst_bind){
			if(($ctl.jst_bind_obj != obj || $ctl.jst_bind_prop != prop)){
				$ctl.removeEventListener("input", $ctl.jst_bind);
				$ctl.jst_bind = undefined;
			}else{
				return;
			}
		}
		var fnc;
		var tagName, typeName, eventName;
		tagName = $ctl.tagName.toLowerCase();
		typeName = $ctl.getAttribute("type").toLocaleLowerCase();
		if(tagName == "input" && typeName == "checkbox"){
			eventName = "change";
			fnc = function(){
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
		}
		if( tagName == "input" && typeName == "radio"){
			eventName = "change";
			fnc = function(){
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
		}
		if( tagName == "input" && ["text", "number", "date", "file", "password", "hidden"].indexOf(typeName) >= 0){
			eventName = "input";
			fnc = function(){
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
			$ctl.value = obj[prop];
		}
		if( tagName == "select"){
			eventName = "change";
			fnc = function(){
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
		}
		if(eventName){
			$ctl.jst_bind = fnc;
			$ctl.jst_bind_obj = obj;
			$ctl.jst_bind_prop = prop;
	
			$ctl.addEventListener(eventName, fnc);
			
		}
	}
	
	var init = function($jst, name, dom, preserveWhiteSpace){
		var i, seq, tmpl, elm = document.createElement("div");
		if(typeof(dom) == "string"){
			elm.innerHTML = dom;
		}else{
			if(dom.nodeType != 1){
				throw "Illegal parameter";
			}
			elm.innerHTML = dom.innerHTML;				
		}	
		preserveWhiteSpace = (preserveWhiteSpace === undefined || preserveWhiteSpace === "false" || preserveWhiteSpace === 0 || preserveWhiteSpace === false)? false : true

		$jst.id = jst_attr_prefix + "id-" + name;
		$jst.nodes = [];
		compile($jst, elm, preserveWhiteSpace, 1, $jst.id);
		$jst.nodes[0] = elm.innerHTML;

		console.log($jst);
		return;
	}
	
	var execute = jst.execute = function ($ctx, node, seq, nodeName, nodeValue, fnc){
		var $jst = $ctx.$jst, $target = $ctx.$target, $data = $ctx.$data;
		if(!$jst.nodes[seq].cache){
			$jst.nodes[seq].cache= {};
		}
		if(nodeValue.match(/^\{\{.*?\}\}$/g)){
			var executor = $jst.nodes[seq].cache[nodeValue];
			if(executor === undefined){
		  		$jst.nodes[seq].cache[nodeValue] = executor = fnc.create(nodeValue.substr(2, nodeValue.length - 4));
		  	}
		  	return executor($ctx, node);
		}else{
			return nodeValue;
		}
	}

	var dummyElement = document.createElement("div");
	jst.node = {
		comment : function(id, node){
			var seq = node.getAttribute(id);
			if(seq){
				return jst.node.replace(node, document.createComment(id + "=" + seq));
			}
			return node;
		},
		attr : function (node, nodeName, nodeValue){
			var tagName = node.nodeName.toLocaleLowerCase();
			if(special_attributes[tagName] &&
		  		special_attributes[tagName].indexOf(nodeName) >= 0 && (nodeValue === false || nodeValue === "false" || nodeValue === 0)){
	  			node.removeAttribute(nodeName);
		  	}else{
		  		if(node.getAttribute(nodeName) != nodeValue){
					node.setAttribute(nodeName, nodeValue);
		  		}
		  	}
		  	if(nodeName == "value" && tagName == "input"){
		  		node.value = nodeValue;
		  	}
		},
		create : function (node){
			dummyElement.innerHTML = node;
			return dummyElement.firstChild;
		},
		replace : function (node, repl){
			node.parentNode.insertBefore(repl, node);
			node.parentNode.removeChild(node);
			return repl;
		},
		
		remove : function (node){
			node = node.previousSibling;
			node.parentNode.removeChild(node.nextSibling);
			return node.nextSibling;
		},
		
		text : function(node, preserveWhiteSpace){
			var result, parent = node.parentNode, sibling = node.nextSibling, elm = document.createElement("div");
			elm.appendChild(node);
			result = elm.innerHTML;
			if(sibling){
				parent.insertBefore(node, sibling);
			}else{
				parent.appendChild(node);
			}
			return preserveWhiteSpace? result : result.replace(/(^\s*)|(\s*$)/g, "");
		}		
	}
	
	var compile_attribute = function ($jst, seq, attrs){
		var nodeName, nodeValue, pre_process_attrs = [], post_process_attrs = [];
		jst.pre_process_attributes.forEach(function(tag, idx){
			if(tag.name != "*"){
				nodeName = tag.name;
				nodeValue = attrs[nodeName];
				if(nodeValue != undefined){
					pre_process_attrs.push({name: nodeName, value: nodeValue, processor: tag.process});
				}
			}else{
				for(nodeName in attrs){
					if(nodeName.indexOf(jst_attr_prefix) != 0){
						nodeValue = attrs[nodeName];
						pre_process_attrs.push({name: nodeName, value: nodeValue, processor: tag.process});
					}
				}
			}
		});
		
		jst.post_process_attributes.forEach(function(tag, idx){
			nodeName = tag.name;
			nodeValue = attrs[nodeName];
			if(nodeValue != undefined){
				post_process_attrs.push({name: nodeName, value: nodeValue, processor: tag.process});
			}
		});
		
		return {pre_process_attrs : pre_process_attrs, post_process_attrs : post_process_attrs};
	}
	
	var compile = function($jst, dom, preserveWhiteSpace, seq, tid) {
		var i, 
			node,
			txtnode, 
			txt,
			attrs, nodeName, nodeValue,
			elm = document.createElement("div");
			
		node = dom.childNodes[0];
		while(node){
			if(node.nodeType == 3){
				txt = jst.node.text(node, preserveWhiteSpace);
				if(txt.length> 1){
					txt = txt.replace(/\{\{.*?\}\}/g, function(c){
						elm.innerText = c;
						var t = elm.innerHTML;
						return "<span " + jst_attr_text + "=\"" + t.replace(/\"/g, "&quot;") + "\"></span>";
					});
					elm.innerHTML = txt;
					txtnode = elm.childNodes[0];
					while(elm.childNodes.length > 0){
						dom.insertBefore(elm.childNodes[0], node);
					}
					node.parentNode.removeChild(node);
					node = txtnode;
				}else{
					var txtnode = node;
					node = node.nextSibling;
					txtnode.parentNode.removeChild(txtnode);
				}
			}
			if(node && node.nodeType == 1){
				if(node.getAttribute(jst_attr_if)){
					node.removeAttribute(jst_attr_case);
				}
				if(node.getAttribute(jst_attr_repeat)){
					node.removeAttribute(jst_attr_loop);
				}
				if(!node.getAttribute(jst_attr_repeat) && !node.getAttribute(jst_attr_loop)){
					node.removeAttribute(jst_attr_filter);
				}

				attrs = {};
				for(i = 0; i < node.attributes.length; ++ i){
					nodeName = node.attributes[i].nodeName;
					nodeValue = node.attributes[i].nodeValue;
					if(nodeName.indexOf(jst_attr_prefix) == 0 || nodeValue.match(/\{\{.+?\}\}/g)){
						attrs[nodeName] = nodeValue;
						node.removeAttribute(nodeName);
						-- i;
					}
				}
				nodeValue = 0;
				attrs = compile_attribute($jst, seq, attrs);					
				if(attrs.pre_process_attrs.length > 0 || attrs.post_process_attrs.length > 0){
					$jst.nodes[seq] = attrs;
					nodeValue = seq;
					node.setAttribute(tid, seq ++);
				}
				
				if(node.getAttribute(jst_attr_skip) == null){
					seq = compile($jst, node, preserveWhiteSpace, seq, tid);
				}
				
				if(nodeValue){
					$jst.nodes[nodeValue]["dom"] = node.outerHTML;
				}
			}
			
			if(node){
				node = node.nextSibling;
			}
		}
		return seq;
	}

	var process_attrbutes = jst.process_attrbutes = function($ctx, node, type, skips){
		var orgnode = node, id = $ctx.$jst.id, inf,
			tag, attr, seq, i;
			
		seq = node.getAttribute(id);
		if(seq){
			inf = (type==0)? $ctx.$jst.nodes[seq].pre_process_attrs : $ctx.$jst.nodes[seq].post_process_attrs;
			for(i=0; i < inf.length; ++ i){
				attr = inf[i];
				if(skips.indexOf(attr.name) < 0){
					node = attr.processor($ctx, node, seq, attr.name, attr.value);
					if(node != orgnode){
						break;
					}
				}
			}
		}
		return node;
	}

	var process = jst.process = function($ctx, $ctl){
		var node = $ctl.childNodes[0], orgnode, seq, expr;
		while(node){
			if(node.nodeType == 8){
				expr = node.nodeValue;
				if(expr.indexOf($ctx.$jst.id+"=") == 0){
					seq = expr.substr(1 + $ctx.$jst.id.length);
					node = jst.node.replace(node, jst.node.create($ctx.$jst.nodes[seq].dom));
				}
			}
			if(node.nodeType == 1){
				orgnode = node;
				node = process_attrbutes($ctx, node, 0, []);
				if(node && node == orgnode){
					process($ctx, node);
					node = process_attrbutes($ctx, node, 1, []);
				}
			}
			if(node){
				node = node.nextSibling;
			}
		}
		return $ctl;
	}
	
	jst.prototype.dirty = function(target){
		if(!target.jst_dirty){
			target.jst_dirty = true;
			setTimeout(function(){
				target.jst_ctx.$jst.render(target, target.jst_ctx.$data);
				target.jst_dirty = false;
			}, 100);
		}
	}

	jst.prototype.render = function(target, data, refresh){
		if(refresh){
			target.innerHTML = this.nodes[0];
		}
		var ctx = {
			$jst    : this,
			$target : target,
			$data   : data
		}

		target.jst_ctx = ctx
		target.jst_dirty = false;

		process(ctx, target);
	}
	
	if ( typeof module === "object" && module && typeof module.exports === "object" ) {
		module.exports = jst;
	} else {
		window.jst = jst;
		if ( typeof define === "function" && define.amd ) {
			define( "jst", [], function () { return jst; } );
		}
		if (typeof define === "function" && typeof seajs == "object") {
			define("jst", function(require, exports, module) {
				module.exports = window.jst = jst;
			});
		}
	}

})();


