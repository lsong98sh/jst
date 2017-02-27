(function() {
	var REGEX_VARIABLE = new RegExp(/\{\{(.+?)\}\}/g);
	var jst_attr_prefix = window.jst_jst_attr_prefix || "jst-";

	var jst = function(name, dom, preserveWhiteSpace) {
		init(this, name, dom, preserveWhiteSpace);
	}

	jst.attrs = {};
	var jst_attr_skip        = jst.attrs.skip        = jst_attr_prefix + "skip";
	var jst_attr_begin       = jst.attrs.begin       = jst_attr_prefix + "begin";
	var jst_attr_if          = jst.attrs.if          = jst_attr_prefix + "if";
	var jst_attr_repeat      = jst.attrs.repeat      = jst_attr_prefix + "repeat";
	var jst_attr_filter      = jst.attrs.filter      = jst_attr_prefix + "filter";
	var jst_attr_item_begin  = jst.attr.item_begin   = jst_attr_prefix + "item-begin";
	var jst_attr_html        = jst.attrs.html        = jst_attr_prefix + "html";
	var jst_attr_text        = jst.attrs.text        = jst_attr_prefix + "text";
	var jst_attr_bind        = jst.attrs.bind        = jst_attr_prefix + "bind";
	var jst_attr_call        = jst.attrs.call        = jst_attr_prefix + "call";
	var jst_attr_recursive   = jst.attrs.recursive   = jst_attr_prefix + "recursive";
	var jst_attr_child_begin = jst.attrs.child_begin = jst_attr_prefix + "child-begin";
	var jst_attr_child_end   = jst.attrs.child_end   = jst_attr_prefix + "child-end";
	var jst_attr_item_end    = jst.attrs.item_end    = jst_attr_prefix + "item-end";
	var jst_attr_end         = jst.attrs.end         = jst_attr_prefix + "end";
	
	var jst_other_attrs    = jst.jst_other_attrs = "*";
	
	var directives = jst.directives = {};
	/* compile/startup/cleanup/process/begin/end */
	/*
	 * compile: 
	 *     true: continue
	 *     false: break 
	 *     function: if(nodeValue) create a processor & continue
	 * startup: call before process attributes
	 * cleanup: call after processing the attributes
	 * process: call on each directive
	 * begin:   call before processing the child nodes
	 * end:     call after processing the child nodes
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
		startup: function($ctx, node, seq){
			return false;
		}
	};
	directives[jst_attr_begin] = {
		name: jst_attr_begin,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				node.removeAttribute(jst_attr_begin);
				result.parameters.push({directive: directives[jst_attr_begin], name: nodeName, value: nodeValue, processor: exec_call_function.create(nodeValue) });
			}
			return true;
		},
		startup: function($ctx, node, seq, parameter) {
			if(parameter.processor){
				parameter.processor($ctx, node);
			}
			return true;
		},
		cleanup: function($ctx, node, seq, parameter) {
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
				result.parameters.push({directive: directives[jst_attr_if], name: nodeName, value: nodeValue, processor: exec_value_function.create(nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : false;
			if(value.toString().indexOf("@") == 0){
				var comment = "<!--" + jst_attr_if + "@" + $ctx.$jst.id + "=" + seq + "-->";
				if(value=="@" || value.toLowerCase() == "@false" || value == "@0") {
					node.innerHTML = comment;
					return false;
				} else {
					if(node.innerHTML == comment) {
						node.innerHTML = $ctx.$jst.nodes[seq].dom.innerHTML;
					}
				}
			}else{
				if(!value) {
					return jst.node.comment($ctx.$jst.id, node);
				}
			}
			return true;
		}
	};
	directives[jst_attr_repeat] = {
		name: jst_attr_repeat,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_repeat], name: nodeName, value: nodeValue, processor: exec_repeat_function.create(nodeValue) });
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
			if(parameter && parameter.processor){
				return parameter.processor($ctx, node);
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
				result.parameters.push({directive: directives[jst_attr_filter], name: nodeName, value: nodeValue, processor: exec_value_function.create(nodeValue) });
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : false;
			if(!value) {
				return jst.node.comment($ctx.$jst.id, node);
			}
			return true;
		}
	};
	directives[jst_attr_html] = {
		name: jst_attr_html,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_html], name: nodeName, value: nodeValue, processor: exec_value_function.create(nodeValue) });
				node.removeAttribute(jst_attr_html); 
				node.removeAttribute(jst_attr_text);
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
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
				result.parameters.push({directive: directives[jst_attr_text], name: nodeName, value: nodeValue, processor: exec_value_function.create(nodeValue) });
				node.removeAttribute(jst_attr_text);
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
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
					if(nodeValue.match(REGEX_VARIABLE)){
						result.parameters.push({directive: directives[jst_other_attrs], name: nodeName, value: nodeValue, processor: exec_value_function.create(nodeValue) });
						node.removeAttribute(nodeName);
						-- i;
					}
				}
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : "";
			jst.node.attr(node, parameter.name, value)
			return true;
		},
	};
	directives[jst_attr_bind] = {
		name: jst_attr_bind,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_bind], name: nodeName, value: nodeValue, processor: exec_bind_function.create(nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, nodeName, nodeValue) {
			var value = execute($ctx, node, seq, nodeName, nodeValue);
			if(!value.fnc) {
				value.fnc = exec_bind;
			}
			value.fnc($ctx, node, value.obj, value.key);
			return true;
		},
	};
	directives[jst_attr_call] = {
		name: jst_attr_call,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_call], name: nodeName, value: nodeValue, processor: exec_call_function.create(nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
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
				result.parameters.push({directive: directives[jst_attr_recursive], name: nodeName, value: nodeValue, processor: exec_value_function.create(nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, parameter) {
			var value = parameter.processor? parameter.processor($ctx, node) : true;
			if(!value) {
				return false;
			}
			return true;
		}
	};
	directives[jst_attr_end] = {
		name: jst_attr_end,
		compile: function($jst, node, result, nodeName, nodeValue) {
			if(nodeValue != null){
				result.parameters.push({directive: directives[jst_attr_end], name: nodeName, value: nodeValue, processor: exec_call_function.create(nodeValue) });
				node.removeAttribute(nodeName);	
			}
			return true;
		},
		process: function($ctx, node, seq, nodeName, nodeValue) {
			return true;
		}
	};
	
	var directive_list = jst.directive_list = [
		jst_attr_skip,
		jst_attr_begin,
		jst_attr_if,
		jst_attr_repeat,
		jst_attr_filter,
		jst_attr_html,
		jst_attr_text,
		jst_other_attrs,
		jst_attr_bind,
		jst_attr_call,
		jst_attr_recursive,
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
	exec_call_function.create = function(expr) {
		REGEX_VARIABLE.lastIndex = 0;
		var expr = REGEX_VARIABLE.exec(expr);
		if(expr.length>0){
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
	
	exec_value_function.create = function(expr) {
		var parts = [];
		var s, p = 0;
		REGEX_VARIABLE.lastIndex = 0;

		while ((s = REGEX_VARIABLE.exec(expr))) {
			if (s.index > 0) {
				parts.push(expr.substring(p, s.index));
			}
			parts.push(s[0])
			p = s.index + s[0].length;
		}
		if(p < expr.length){
			parts.push(expr.substring(p));
		}

		for(p = 0; p < parts.length; ++ p){
			REGEX_VARIABLE.lastIndex = 0;
			if((s = REGEX_VARIABLE.exec(parts[p]))){
				parts[p] = create_vm_function(exec_value_function, { "TODO": s[1] });
			}
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
	function exec_repeat_function($ctx, $ctl) {
		try {
			var $jst = $ctx.$jst,
				$target = $ctx.$target,
				$data = $ctx.$data;
			var count = 0,
				node = $ctl,
				parent = $ctl.parentNode,
				seq = $ctl.getAttribute($jst.id),
				start, parameters, result;
			
			parameters = $jst.nodes[seq].parameters;
			for(var i = 0; i < parameters.length; ++ i){
				parameter = parameters[i];
				if(parameter.name == jst.attrs.repeat){
					start = i + 1;
					break;
				}
			}
			with($data) {
				for(;;) 
				{
					if(!node) {
						node = parent.appendChild(jst.node.create($jst.nodes[seq].dom));
					}
					if(node.getAttribute($jst.id) != seq) {
						node = parent.insertBefore(jst.node.create($jst.nodes[seq].dom), node);
					}
					result = jst.process_attrbutes($ctx, node, seq, start);
					if(result.node.nodeType == 8) {
						node = jst.node.replace(result.node, jst.node.create($jst.nodes[seq].dom));
					} else {
						++count;
						if(result.recursive === true) {
							process($ctx, result.node);
						}
						i = result.cleanup_start_idx;
						n = result.cleanup_end_idx;
						node = result.node.nextSibling;
					} 
					for(; i >= n; -- i){
						parameter = parameters[i];
						directive = parameter.directive;
						if(directive && directive.cleanup){
							directive.cleanup($ctx, node, seq, parameter);
						}
					}
				}
				if(count == 0) {
					node = jst.node.comment($jst.id, node).nextSibling;
				}
				var next;
				while(node && node.nodeType == 1 && node.getAttribute($jst.id) == seq) {
					next = node.nextSibling;
					node.parentNode.removeChild(node);
					node = next;
				}
			}
		} catch(err) {
			console.log(err);
		}
		return node.previousSibling;
	}
	exec_repeat_function.create = function(expr) {
		REGEX_VARIABLE.lastIndex = 0;
		var expr = REGEX_VARIABLE.exec(expr);
		if(expr.length>0){
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
	exec_bind_function.create = function(expr) {
		REGEX_VARIABLE.lastIndex = 0;
		var expr = REGEX_VARIABLE.exec(expr);
		if(expr.length>0){
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

	var dummyElement = document.createElement("div");
	jst.node = {
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
			dummyElement.innerHTML = node.outerHTML;
			return dummyElement.firstChild;
		},
		replace: function(node, repl) {
			node.parentNode.insertBefore(repl, node);
			node.parentNode.removeChild(node);
			return repl;
		},
		remove: function(node) {
			node = node.previousSibling;
			node.parentNode.removeChild(node.nextSibling);
			return node.nextSibling;
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
/*
	var compile_attribute = function($jst, node, seq, attrs) {
		var nodeValue, pre_process_attrs = [],
			post_process_attrs = [], parsers = {};
			
		jst.pre_process_attributes.forEach(function(nodeName, idx) {
			directive = directives[nodeName];
			if(directive.name != jst_other_attrs) {
				nodeValue = attrs[nodeName];
				if(nodeValue != undefined) {
					if(directive.parser){
						parsers[nodeName+"="+nodeValue] = directive.parser.create(nodeValue);
					}
					pre_process_attrs.push({ name: nodeName, value: nodeValue, processor: directive.process });
				}
			} else {
				for(nodeName in attrs) {
					if(nodeName.indexOf(jst_attr_prefix) != 0) {
						nodeValue = attrs[nodeName];
						if(directive.parser){
							parsers[nodeName+"="+nodeValue] = directive.parser.create(nodeValue); 
						}
						pre_process_attrs.push({ name: nodeName, value: nodeValue, processor: directive.process });
					}
				}
			}
		});

		jst.post_process_attributes.forEach(function(nodeName, idx) {
			directive = directives[nodeName];
			nodeValue = attrs[nodeName];
			if(nodeValue != undefined) {
				if(directive.parser){
					parsers[nodeName+"="+nodeValue] = directive.parser.create(nodeValue);
				}
				post_process_attrs.push({ name: nodeName, value: nodeValue, processor: directive.process });
			}
		});

		return { parsers: parsers, pre_process_attrs: pre_process_attrs, post_process_attrs: post_process_attrs };
	}
*/
	var convert_text_node = function(node, preserveWhiteSpace){
		var dom = node.parentNode, elm = dummyElement, txt = jst.node.text(node, preserveWhiteSpace), result;
		if(txt.length > 1) {
			txt = txt.replace(/\{\{.*?\}\}/g, function(c) {
				return "<span " + jst_attr_text + "=\"" + c.replace(/'/g, "&apos;").replace(/"/g, "&quot;").replace(/>/g, "&gt;").replace(/</g, "&lt;") + "\"></span>";
			});
			elm.innerHTML = txt;
			result = elm.childNodes[0];
			while(elm.childNodes.length > 0) {
				dom.insertBefore(elm.childNodes[0], node);
			}
		} else {
			result = node.nextSibling;
		}
		node.parentNode.removeChild(node);
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
	
	var process_attrbutes = jst.process_attrbutes = function($ctx, node, seq, start_idx) {
		var orgnode = node, result,	directive, parameters, parameter, status, i;

		parameters = $ctx.$jst.nodes[seq].parameters;
		result = {recursive : true, node : node, cleanup_start_idx: parameters.length - 1, cleanup_end_idx: start_idx}
		for(i = start_idx; i < parameters.length; ++i) {
			parameter = parameters[i];
			directive = parameter.directive;
			if(directive.process){
				status = directive.process($ctx, node, seq, parameter);    
				if(status !== true) {
					result.cleanup_start_idx = i;
					if(status === false){
						result.recursive = status; 
					}else{
						result.recursive = false;
						result.node = status;  //repeat
					}
					break;
				}
			}
		}
		return result;
	}

	var process = jst.process = function($ctx, $ctl) {
		var node = $ctl.childNodes[0], result, seq, expr, i, directive, parameter, n;
		while(node) {
			if(node.nodeType == 8) {
				expr = node.nodeValue;
				if(expr.indexOf($ctx.$jst.id + "=") == 0) {
					seq = expr.substr(1 + $ctx.$jst.id.length);
					node = jst.node.replace(node, jst.node.create($ctx.$jst.nodes[seq].dom));
				}
			}
			if(node.nodeType == 1) {
				seq = node.getAttribute($ctx.$jst.id);
				if(seq){
					parameters = $ctx.$jst.nodes[seq].parameters;
					n = $ctx.$jst.nodes[seq].parameters.length;
					for(i=0; i < n; ++ i){
						parameter = parameters[i];
						directive = parameter.directive;
						if(directive && directive.startup && !directive.startup($ctx, node, seq, parameter)){
							break;
						}
					}
					if(i >= n){
						result = process_attrbutes($ctx, node, seq, 0);
						if(result.recursive === true) {
							process($ctx, result.node);
						}
						i = result.cleanup_start_idx;
						n = result.cleanup_end_idx;
						node = result.node;
					} else {
						n = 0;
					}
					for(; i >= n; -- i){
						parameter = parameters[i];
						directive = parameter.directive;
						if(directive && directive.cleanup){
							directive.cleanup($ctx, node, seq, parameter);
						}
					}
				}
			}
			node = node? node.nextSibling : node;
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
			$data: data
		}

		target.jst_ctx = ctx
		target.jst_dirty = false;

		process(ctx, target);
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