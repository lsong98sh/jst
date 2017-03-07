(function() {
	var REGEX_EXPRESSION = new RegExp(/\{\{(.+?)\}\}/g);
	function uuid(len) {
	    var i, s = [], digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
		len = len? len : 16;
	    
	    for(i = 0; i < len; i++) {
	        s[i] = digits.substr(Math.floor(Math.random() * 62), 1);
	    }
	    return s.join("");
	}

	var jst = function(name, dom, preserveWhiteSpace) {
		init(this, name, dom, preserveWhiteSpace);
	}

	jst.attrs = {};
	
	var jst_attr_prefix      = jst.attrs.prefix      = window.jst_jst_attr_prefix || "jst-";
	
	var jst_attr_skip        = jst.attrs.skip        = jst_attr_prefix + "skip";
	var jst_attr_begin       = jst.attrs.begin       = jst_attr_prefix + "begin";
	var jst_attr_if          = jst.attrs.if          = jst_attr_prefix + "if";
	var jst_attr_repeat      = jst.attrs.repeat      = jst_attr_prefix + "repeat";
	var jst_attr_filter      = jst.attrs.filter      = jst_attr_prefix + "filter";
	var jst_attr_item_begin  = jst.attrs.item_begin   = jst_attr_prefix + "item-begin";
	var jst_attr_html        = jst.attrs.html        = jst_attr_prefix + "html";
	var jst_attr_text        = jst.attrs.text        = jst_attr_prefix + "text";
	var jst_attr_bind        = jst.attrs.bind        = jst_attr_prefix + "bind";
	var jst_attr_call        = jst.attrs.call        = jst_attr_prefix + "call";
	var jst_attr_recursive   = jst.attrs.recursive   = jst_attr_prefix + "recursive";
	var jst_attr_item_end    = jst.attrs.item_end    = jst_attr_prefix + "item-end";
	var jst_attr_end         = jst.attrs.end         = jst_attr_prefix + "end";
	
	var jst_other_attrs    = jst.jst_other_attrs = "*";
	
	var directives = jst.directives = {};
	/* compile/process/cleanup */
	/*
	 * compile: 
	 *     true: continue
	 *     false: break 
	 *     function: if(nodeValue) create a processor & continue
	 * process: call on each directive
	 * cleanup: call after processing the attributes
	 * 
	 */
	directives[jst_attr_skip] = {
		name: jst_attr_skip,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_skip], name: nodeName, value: "true" });
				/* delete other directives & return false */
				var i, nodeName;
				for(i = 0; i < node.attributes.length; ++i){
					nodeName = node.attributes[i].nodeName; 
					if(directives[nodeName] != undefined && directives[nodeName].name != jst_other_attrs){
						node.removeAttribute(nodeName);
						--i;
					}
				}
				return false;
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter){
			result.recursive = false;
			return false;
		}
	};
	directives[jst_attr_begin] = {
		name: jst_attr_begin,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				node.removeAttribute(jst_attr_begin);
				result.parameters.push({directive: directives[jst_attr_begin], name: nodeName, value: nodeValue, processor: exec_call_function.create($jst, nodeValue) });
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter.processor){
				parameter.processor($ctx, node);
			}
			return true;
		},
		cleanup: function($ctx, node, seq, result, parameter) {
			var i, parameter, parameters = $ctx.$jst.nodes[seq].parameters;
			for(i=parameters.length-1; i > 0; -- i){
				if(parameters[i].directive && parameters[i].directive.name == jst_attr_end){
					parameter = parameters[i]
					if(parameter.processor){
						parameter.processor($ctx, node);
					}
				}
			}						
		}
	};
	directives[jst_attr_if] = {
		name: jst_attr_if,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_if], name: nodeName, value: nodeValue, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : false;
			if(value.toString().indexOf("@") == 0){
				var comment = "<!--" + jst_attr_if + "@" + $ctx.$jst.id + "=" + seq + "-->";
				if(value=="@" || value.toLowerCase() == "@false" || value == "@0") {
					node.innerHTML = comment;
					result.recursive = false;
					return false;
				} else {
					if(node.innerHTML == comment) {
						node.innerHTML = $ctx.$jst.nodes[seq].dom.innerHTML;
					}
				}
			}else{
				if(!value) {
					result.node = jst.node.comment($ctx.$jst.id, node);
					result.recursive = false;
					return false;
				}
			}
			return true;
		}
	};
	directives[jst_attr_repeat] = {
		name: jst_attr_repeat,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_repeat], name: nodeName, value: nodeValue, processor: exec_repeat_function.create($jst, nodeValue) });
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter && parameter.processor){
				var i, start_idx = 0, parameters = $ctx.$jst.nodes[seq].parameters;
				for(i = 0; i < parameters.length; ++ i){
					if(parameters[i].name == jst.attrs.repeat){
						start_idx = i + 1;
						break;
					}
				}
				result.node = parameter.processor($ctx, node, start_idx);
				result.recursive = false;
				return false;
			}else{
				return true;
			}
		}
	};
	directives[jst_attr_filter] = {
		name: jst_attr_filter,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(node.getAttribute(jst_attr_repeat) == null){
				node.removeAttribute(nodeName);	
				nodeValue = null;
			}
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_filter], name: nodeName, value: nodeValue, processor: exec_value_function.create($jst, nodeValue) });
			}
			node.removeAttribute(jst_attr_filter);
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : false;
			if(!value) {
				result.node = jst.node.comment($ctx.$jst.id, node);
				return false;
			}
			return true;
		}
	};
	directives[jst_attr_item_begin] = {
		name: jst_attr_begin,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(node.getAttribute(jst_attr_repeat) == null){
				node.removeAttribute(nodeName);	
				nodeValue = null;
			}
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_item_begin], name: nodeName, value: nodeValue, processor: exec_call_function.create($jst, nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter.processor){
				parameter.processor($ctx, node);
			}
			return true;
		},
		cleanup: function($ctx, node, seq, result, parameter) {
			var i, parameter, parameters = $ctx.$jst.nodes[seq].parameters;
			for(i=parameters.length-1; i > 0; -- i){
				if(parameters[i].directive && parameters[i].directive.name == jst_attr_item_end){
					parameter = parameters[i]
					if(parameter.processor){
						parameter.processor($ctx, node);
					}
				}
			}						
		}		
	};	
	directives[jst_attr_html] = {
		name: jst_attr_html,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_html], name: nodeName, value: nodeValue, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(jst_attr_html); 
				node.removeAttribute(jst_attr_text);
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : "";
			if(value === undefined || value === null) {
				value = "";
			}
			node.innerHTML = value;
			return true;
		}
	};
	directives[jst_attr_text] = {
		name: jst_attr_text,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_text], name: nodeName, value: nodeValue, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(jst_attr_text);
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : "";
			if(value === undefined || value === null) {
				value = "";
			}
			node.innerText = value;
			return true;
		},
	};
	directives[jst_other_attrs] = {
		name: jst_other_attrs,
		compile: function($jst, node, result, nodeName, nodeValue) {
			var i;
			for(i=0; i < node.attributes.length; ++i){
				nodeName = node.attributes[i].nodeName;
				if(directives[nodeName] === undefined){
					nodeValue = node.attributes[i].nodeValue;
					if(nodeValue.match(REGEX_EXPRESSION)){
						result.parameters.push({directive: directives[jst_other_attrs], name: nodeName, value: nodeValue, processor: exec_value_function.create($jst, nodeValue) });
						node.removeAttribute(nodeName);
						-- i;
					}
				}
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : "";
			var name = parameter.name
			jst.node.attr(node, name.indexOf(jst_attr_prefix)==0? name.substr(jst_attr_prefix.length) : name, value)
			return true;
		},
	};
	directives[jst_attr_bind] = {
		name: jst_attr_bind,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_bind], name: nodeName, value: nodeValue, processor: exec_bind_function.create($jst, nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			//var value = execute($ctx, node, seq, nodeName, nodeValue);
			//if(!value.fnc) {
			//	value.fnc = exec_bind;
			//}
			//value.fnc($ctx, node, value.obj, value.key);
			return true;
		},
	};
	directives[jst_attr_call] = {
		name: jst_attr_call,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_call], name: nodeName, value: nodeValue, processor: exec_call_function.create($jst, nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter.processor){
				parameter.processor($ctx, node);
			}
			return true;
		},
	};
	directives[jst_attr_recursive] = {
		name: jst_attr_recursive,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_recursive], name: nodeName, value: nodeValue, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : true;
			if(!value) {
				result.recursive = false;
			}
			return true;
		}
	};
	directives[jst_attr_item_end] = {
		name: jst_attr_item_end,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(node.getAttribute(jst_attr_repeat) == null){
				node.removeAttribute(nodeName);	
				nodeValue = null;
			}
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_item_end], name: nodeName, value: nodeValue, processor: exec_call_function.create($jst, nodeValue) });
				node.removeAttribute(nodeName);	
			}
			node.removeAttribute(jst_attr_repeat);
			return true;
		}
	};
	directives[jst_attr_end] = {
		name: jst_attr_end,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_end], name: nodeName, value: nodeValue, processor: exec_call_function.create($jst, nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		}
	};
	
	var directive_list = jst.directive_list = [
		jst_attr_skip,
		jst_attr_begin,
		jst_attr_if,
		jst_attr_repeat,
		jst_attr_filter,
		jst_attr_item_begin,
		jst_attr_html,
		jst_attr_text,
		jst_other_attrs,
		jst_attr_bind,
		jst_attr_call,
		jst_attr_recursive,
		jst_attr_item_end,
		jst_attr_end
	];
	
	var special_attributes = {
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

	function create_vm_function(func, rep) {
		var txt = func.toString(); //TODO: remove comments
		var args = txt.substring(txt.indexOf("(") + 1, txt.indexOf(")")).replace(/\s/g, "").split(",");
		var body = txt.substring(txt.indexOf("{") + 1, txt.lastIndexOf("}"));
		for(expr in rep) {
			body = body.replace(new RegExp(expr), rep[expr]);
		}
		args.push(body);

		return Function.apply(this, args);
	}

	/* evaluation call function */
	function exec_call_function($ctx, $ctl) {
		try {
			var $data = $ctx.$data,
				$jst = $ctx.$jst,
				$data = $ctx.$data;
			with($data) {
				TODO;
				return $ctl;
			}
		} catch(err) {
			console.log(err);
			return undefined;
		}
	}
	exec_call_function.create = function($jst, expr) {
		REGEX_EXPRESSION.lastIndex = 0;
		var expr = REGEX_EXPRESSION.exec(expr);
		if(expr && expr.length>0){
			return create_vm_function(exec_call_function, { "TODO": expr[1] });
		} else {
			return null;
		}
	}

	/* evaluation value function */
	function exec_value_function($ctx, $ctl) {
		try {
			var $jst = $ctx.$jst,
				$target = $ctx.$target,
				$data = $ctx.$data;
			with($data) {
				return TODO;
			}
		} catch(err) {
			console.log(err);
			return undefined;
		}
	}
	
	exec_value_function.create = function($jst, expr) {
		var parts = [];
		var s, p = 0;
		REGEX_EXPRESSION.lastIndex = 0;

		while ((s = REGEX_EXPRESSION.exec(expr))) {
			if (s.index > 0) {
				parts.push(expr.substring(p, s.index));
			}
			parts.push(create_vm_function(exec_value_function, { "TODO": s[1] }))
			p = s.index + s[0].length;
		}
		if(p < expr.length){
			parts.push(expr.substring(p));
		}

		return function($ctx, $ctl){
			if(parts.length == 1 && typeof(parts[0]) == "function"){
				return parts[0]($ctx, $ctl);
			}
			var i, result = [];
			for(i in parts){
				result.push(typeof(parts[i]) == "string"? parts[i] : parts[i]($ctx, $ctl));
			}
			return result.join("");
		};
	}

	/* evaluation repeat function */
	function exec_repeat_function($ctx, $ctl, $start_idx) {
		try {
			var $jst = $ctx.$jst,
				$target = $ctx.$target,
				$data = $ctx.$data;

			var $seq = $ctl.getAttribute($jst.id) - 0, $count = 0, $node = $ctl, $result;

			with($data) {
				for(;;) {
					if(!$node) {
						$node = $ctl.parentNode.appendChild(jst.node.create($jst.nodes[$seq].dom));
					}
					if($node.nodeType != 1 || $node.getAttribute($jst.id) != $seq) {
						$node = $ctl.parentNode.insertBefore(jst.node.create($jst.nodes[$seq].dom), $node);
					}
					$result = jst.process($ctx, $node, $start_idx);
					if($result.nodeType == 8) {
						$node = jst.node.replace($result, jst.node.create($jst.nodes[$seq].dom));
					} else {
						++$count;
						$node = $result.nextSibling;
					} 
				}
				if($count == 0) {
					$result = jst.node.comment($jst.id, $node);
					$node = $result.nextSibling;
				}
				while($node && $node.nodeType == 1 && $node.getAttribute($jst.id) == $seq) {
					var $nextSibling = $node.nextSibling;
					$node.parentNode.removeChild($node);
					$node = $nextSibling;
				}
			}
		} catch(err) {
			console.log(err);
		}
		return $result;
	}
	
	exec_repeat_function.create = function($jst, expr) {
		REGEX_EXPRESSION.lastIndex = 0;
		var expr = REGEX_EXPRESSION.exec(expr);
		if(expr && expr.length>0){
			return create_vm_function(exec_repeat_function, { ";;": expr[1] });
		} else {
			return null;
		}
		
	}

	/* evaluation bind function */
	function exec_bind_function($ctx, $ctl) {
		try {
			var $jst = $ctx.$jst,
				$target = $ctx.$target,
				$data = $ctx.$data;
			with($data) {
				return { obj: OBJ, key: KEY };
			}
		} catch(err) {
			console.log(err);
			return undefined;
		}
	}
	exec_bind_function.create = function($jst, expr) {
		REGEX_EXPRESSION.lastIndex = 0;
		var expr = REGEX_EXPRESSION.exec(expr);
		if(expr && expr.length>0){
			expr =  expr[1];
		} else {
			return null;
		}
		
		var obj, key = expr.match(/\[.+\]$/g);
		if(key) {
			obj = expr.substr(0, expr.lastIndexOf("["));
			key = key[0].substr(1, key[0].length - 2);
		} else {
			var n = expr.lastIndexOf(".");
			if(n < 0) {
				obj = '$data';
				key = expr;
			} else {
				var obj = expr.substr(0, n - 1);
				var key = expr.substr(n + 1);
			}
		}
		if(!key.match(/^\d+$/g)) {
			key = "\"" + expr.replace(/\"/g, "\\\"") + "\"";
		}
		return create_vm_function(exec_bind_function, { "OBJ": obj, "KEY": key });
	}

	var execute = jst.execute = function($ctx, node, seq, nodeName, nodeValue) {
		var parameter = $ctx.$jst.nodes[seq].parsers[nodeName+"="+nodeValue];
		if(parameter == null){
			return nodeValue;
		}
		return parameter($ctx, node);
	}
	
	jst.node = {
		dataKey: "data-jst-data",
		dataCache: {},
		cleanData: function(){
			var key, node = window.event.target;
			if(node.nodeType && node.nodeType == 1 && (key = node.getAttribute(jst.node.dataKey))){
				delete jst.node.dataCache[key];
			}
		},
		data: function(node, name, value){
			if(node.nodeType == 1){
				var key = node.getAttribute(jst.node.dataKey);
				if(!key && value !== undefined){
					key = uuid();
					node.setAttribute(jst.node.dataKey, key);
				}
				if(key){
					var cache = jst.node.dataCache[key] || {};
					if(value!== undefined){
						cache[name] = value;
						jst.node.dataCache[key] = cache;
					}else{
						return cache[name];
					}
				}
			}
		},
		div : document.createElement("div"),
		comment: function(id, node) {
			var seq = node.getAttribute(id);
			if(seq) {
				return jst.node.replace(node, document.createComment(id + "=" + seq));
			}
			return node;
		},
		attr: function(node, nodeName, nodeValue) {
			var tagName = node.nodeName.toLocaleLowerCase();
			if(special_attributes[tagName] &&
				special_attributes[tagName].indexOf(nodeName) >= 0 && (nodeValue === false || nodeValue === "false" || nodeValue === 0)) {
				node.removeAttribute(nodeName);
			} else {
				if(node.getAttribute(nodeName) != nodeValue) {
					node.setAttribute(nodeName, nodeValue);
				}
			}
			if(nodeName == "value" && tagName == "input") {
				node.value = nodeValue;
			}
		},
		create: function(node) {
			jst.node.div.innerHTML = node.outerHTML;
			return jst.node.div.firstChild;
		},
		replace: function(node, repl) {
			node.parentNode.insertBefore(repl, node);
			node.parentNode.removeChild(node);
			return repl;
		},
		text: function(node, preserveWhiteSpace) {
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
	}
	document.addEventListener("DOMNodeRemoved", jst.node.cleanData);

	var convert_text_node = function(node, preserveWhiteSpace){
		var dom = node.parentNode, elm = jst.node.div, txt = jst.node.text(node, preserveWhiteSpace), result = node.nextSibling;
		if(txt.length > 0) {
			txt = txt.replace(REGEX_EXPRESSION, function(c) {
				return "<!--" + jst_attr_text + "=" + c.replace(/>/g, "&gt;").replace(/</g, "&lt;") + "--><!--"+jst_attr_text + ":end-->";
			});
			elm.innerHTML = txt;
			//result = elm.childNodes[0];
			while(elm.childNodes.length > 0) {
				(result == null)? dom.appendChild(elm.childNodes[0]) : dom.insertBefore(elm.childNodes[0], result);
			}
		}
		dom.removeChild(node);
		return result;
	}
	
	var compile = function($jst, dom, preserveWhiteSpace, seq, tid) {
		var node, directive, action, n,	result, nodeName, nodeValue;

		node = dom.childNodes[0];
		while(node) {
			if(node.nodeType == 3) {
				node = convert_text_node(node, preserveWhiteSpace);
			}
			if(node && node.nodeType == 1) {
				result = {parameters: []};
				for(n = 0; n < directive_list.length; ++ n){
					nodeName = directive_list[n];
					directive = directives[nodeName];
					nodeValue = node.getAttribute(nodeName);
					action = !directive.compile || directive.compile($jst, node, result, nodeName, nodeValue);
					if(!action){
						break;
					}
				}
				n = 0;
				if(result.parameters.length > 0 ) {
					$jst.nodes[seq] = result;
					n = seq;
					node.setAttribute(tid, seq++);
				}
				if(action){
					seq = compile($jst, node, preserveWhiteSpace, seq, tid);
				}
				if(n) {
					$jst.nodes[n]["dom"] = { outerHTML: node.outerHTML, innerHTML : node.innerHTML };
				}
			}

			if(node) {
				node = node.nextSibling;
			}
		}
		return seq;
	}

	var init = function($jst, name, dom, preserveWhiteSpace) {
		var i, seq, tmpl, elm = document.createElement("div");
		if(typeof(dom) == "string") {
			elm.innerHTML = dom;
		} else {
			if(dom.nodeType != 1) {
				throw "Illegal parameter";
			}
			elm.innerHTML = dom.innerHTML;
		}
		preserveWhiteSpace = (preserveWhiteSpace === undefined || preserveWhiteSpace === "false" || preserveWhiteSpace === 0 || preserveWhiteSpace === false) ? false : true

		$jst.id = jst_attr_prefix + "id-" + name;
		$jst.nodes = [];
		compile($jst, elm, preserveWhiteSpace, 1, $jst.id);
		$jst.nodes[0] = elm.innerHTML;

		console.log($jst);
		return;
	}
	
	var process_directive = jst.process_directive = function($ctx, node, seq, fname, start_idx, end_idx){
		var parameter, directive,
		    parameters = $ctx.$jst.nodes[seq].parameters,
		    result = {recursive : true, node : node},
		    direction = start_idx <= end_idx? 1 : -1;
		while(true){
			parameter = parameters[start_idx];
			directive = parameter.directive;
			if(directive[fname] && !directive[fname]($ctx, node, seq, result, parameter)){    
				break;
			}
			if(start_idx == end_idx){
				break;
			}
			start_idx += direction;
		}
		result.end_idx = start_idx;
		return result;
	}
	
	var process_textnode = function($ctx, node){
		var expr = node.nodeValue.substring(3 + jst_attr_text.length, node.nodeValue.length - 2),
		    result = node.nextSibling, data, $jst = $ctx.$jst;
		if(result && result.nodeType == 3){
			result = result.nextSibling;
		}
		if(result && result.nodeType == 8 && result.data == jst_attr_text+":end"){
			if(!$jst.expr){
				$jst.expr = {}
			}
			data = "expr_" + expr;
			if(!$jst.expr[data]){
				$jst.expr[data] = create_vm_function(exec_value_function, { "TODO": expr });		
			}
			data = $jst.expr[data]($ctx, node);
			if(data == undefined || data == null){
				data = "";
			}
			node = document.createTextNode(data);
			if(result.previousSibling.nodeType == 8){
				result.parentNode.insertBefore(node, result);
			}else{
				result.previousSibling.data = node.data;
			}
		}else{
			result = node;
		}
		return result;
	}
	
	/* return this node or replaced node or last of this node */
	var process = jst.process = function($ctx, $ctl, start_idx) {
		var node = $ctl, result, seq, end_idx;
		if(node.nodeType == 8) {
			seq = node.nodeValue;
			if(seq.indexOf($ctx.$jst.id + "=") == 0) {
				seq = seq.substr(1 + $ctx.$jst.id.length);
				node = jst.node.replace(node, jst.node.create($ctx.$jst.nodes[seq].dom));
			}else if(seq.indexOf(jst_attr_text+"=") == 0) {
				return process_textnode($ctx, node);
			}
		}
		if(node.nodeType == 1) {
			seq = node.getAttribute($ctx.$jst.id);
			if(seq){
				end_idx = $ctx.$jst.nodes[seq].parameters.length - 1;
				if(start_idx <= end_idx){
					result = process_directive($ctx, node, seq, "process", start_idx, end_idx);
				}else{
					result = {recursive: true, node: node, end_idx: end_idx};
				}
			}else{
				result = {recursive: true, node: node, end_idx: -1};
			}
			if(result.recursive === true) {
				node = result.node.childNodes[0];
				while(node) {
					node = process($ctx, node, 0);
					node = node? node.nextSibling : node;
				}
			}
			if(seq && result.end_idx >= start_idx){
				process_directive($ctx, result.node, seq, "cleanup", result.end_idx, start_idx);
			}
			return result.node;
		}
		return $ctl;
	}

	jst.prototype.dirty = function(target) {
		if(!target.jst_dirty) {
			target.jst_dirty = true;
			setTimeout(function() {
				target.jst_ctx.$jst.render(target, target.jst_ctx.$data);
				target.jst_dirty = false;
			}, 100);
		}
	}

	jst.prototype.render = function(target, data, refresh) {
		if(refresh) {
			target.innerHTML = this.nodes[0];
		}
		var ctx = {
			$jst: this,
			$target: target,
			$data: data,
			$vars: []
		}

		jst.node.data(target, "jst-ctx", ctx);

		process(ctx, target, 0);
	}


	function exec_bind($ctx, $ctl, obj, prop) {
		var $jst = $ctx.$jst,
			$target = $ctx.$target,
			$data = $ctx.$data;
		if($ctl.jst_bind) {
			if(($ctl.jst_bind_obj != obj || $ctl.jst_bind_prop != prop)) {
				$ctl.removeEventListener("input", $ctl.jst_bind);
				$ctl.jst_bind = undefined;
			} else {
				return;
			}
		}
		var fnc;
		var tagName, typeName, eventName;
		tagName = $ctl.tagName.toLowerCase();
		typeName = $ctl.getAttribute("type").toLocaleLowerCase();
		if(tagName == "input" && typeName == "checkbox") {
			eventName = "change";
			fnc = function() {
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
		}
		if(tagName == "input" && typeName == "radio") {
			eventName = "change";
			fnc = function() {
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
		}
		if(tagName == "input" && ["text", "number", "date", "file", "password", "hidden"].indexOf(typeName) >= 0) {
			eventName = "input";
			fnc = function() {
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
			$ctl.value = obj[prop];
		}
		if(tagName == "select") {
			eventName = "change";
			fnc = function() {
				obj[prop] = $ctl.value;
				$jst.dirty($target);
			}
		}
		if(eventName) {
			$ctl.jst_bind = fnc;
			$ctl.jst_bind_obj = obj;
			$ctl.jst_bind_prop = prop;

			$ctl.addEventListener(eventName, fnc);

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