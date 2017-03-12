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

	var jst_attr_prefix = window.jst_jst_attr_prefix || "jst-";

	var jst_attr_text = jst_attr_prefix + "text";

	var directives = [];

	directives.push({
		name: jst_attr_prefix + "skip",
		compile: function($jst, node, result) {
			var nodeValue = node.getAttribute(this.name);
			if(nodeValue != null){
				result.parameters.push({directive: this, name: this.name});
				var i, attrs=[], nodeName;
				for(i = 0; i < node.attributes.length; ++i){
					attrs.push(node.attributes[i].nodeName);
				}
				for(i = 0; i < attrs.length; ++ i){
					nodeName = attrs[i];
					if(directives.find(function(e){return e.name == nodeName}) !== undefined){
						node.removeAttribute(nodeName);
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
	});
	directives.push({
		name: jst_attr_prefix + "begin",
		compile: function($jst, node, result) {
			var nodeValueBegin = node.getAttribute(this.name), nodeValueEnd = node.getAttribute(jst_attr_prefix + "end"), parameter;
			if(nodeValueBegin != null || nodeValueEnd != null){
				node.removeAttribute(this.name);
				node.removeAttribute(jst_attr_prefix + "end");
				parameter = {directive: this, name: this.name};
				if(nodeValueBegin){
					parameter.processorBegin = exec_call_function.create($jst, nodeValueBegin);
				}
				if(nodeValueEnd){
					parameter.processorEnd = exec_call_function.create($jst, nodeValueEnd);
				}
				result.parameters.push(parameter);
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter.processorBegin){
				parameter.processorBegin($ctx, node);
			}
			return true;
		},
		cleanup: function($ctx, node, seq, result, parameter) {
			if(parameter.processorEnd){
				parameter.processorEnd($ctx, node);
			}
			return true;
		}
	});
	directives.push({
		name: jst_attr_prefix + "if",
		compile: function($jst, node, result) {
			var nodeValue = node.getAttribute(this.name);
			if(nodeValue != null){
				result.parameters.push({directive: this, name: this.name, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(this.name);	
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			var rtv = true, value = parameter.processor? parameter.processor($ctx, node) : false;
			if(value.toString().indexOf("@") == 0){
				var comment = "<!--@" + $ctx.$jst.id + "=" + seq + "-->";
				if(value=="@" || value.toLowerCase() == "@false" || value == "@0") {
					node.innerHTML = comment;
					result.recursive = false;
					rtv = false;
				} else {
					if(node.innerHTML == comment) {
						node.innerHTML = $ctx.$jst.nodes[seq].dom.innerHTML;
					}
				}
			}else{
				if(!value) {
					result.node = jst.node.comment($ctx.$jst.id, node);
					result.recursive = false;
					rtv = false;
				}
			}
			node = result.node.nextSibling;
			while(node != null && node.getAttribute){
				if(node.getAttribute($ctx.$jst.id) == seq){
					node = node.previousSibling;
					node.parentNode.removeChild(node.nextSibling);
				}else{
					break;
				}
				node = node.nextSibling;
			}
			return rtv;
		}
	});
	directives.push({
		name: jst_attr_prefix + "repeat",
		compile: function($jst, node, result) {
			var nodeValue = node.getAttribute(this.name);
			if(nodeValue != null){
				node.removeAttribute(this.name);
				result.parameters.push({directive: this, name: this.name, processor: exec_repeat_function.create($jst, nodeValue) });
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter && parameter.processor){
				var start_idx = $ctx.$jst.nodes[seq].parameters.findIndex(function(e){return e.name == jst_attr_prefix + "repeat"}) + 1;
				result.node = parameter.processor($ctx, node, start_idx);
				result.recursive = false;
				return false;
			}else{
				return true;
			}
		}
	});
	directives.push({
		name: jst_attr_prefix + "filter",
		compile: function($jst, node, result) {
			var nodeValue = node.getAttribute(this.name);
			if(result.parameters.find(function(e){return e.name == jst_attr_prefix + "repeat"}) && nodeValue != null){
				result.parameters.push({directive: this, name: this.name, processor: exec_value_function.create($jst, nodeValue) });
			}
			node.removeAttribute(this.name);
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
	});
	directives.push({
		name: jst_attr_prefix + "item-begin",
		compile: function($jst, node, result) {
			var i, nodeValueBegin = node.getAttribute(this.name), nodeValueEnd = node.getAttribute(jst_attr_prefix + "item-end"), parameter;
			if(result.parameters.find(function(e){return e.name == jst_attr_prefix + "repeat"})){
				if(nodeValueBegin != null || nodeValueEnd != null){
					parameter = {directive: this, name: this.name};
					if(nodeValueBegin){
						parameter.processorBegin = exec_call_function.create($jst, nodeValueBegin);
					}
					if(nodeValueEnd){
						parameter.processorEnd = exec_call_function.create($jst, nodeValueEnd);
					}
					result.parameters.push(parameter);
				}
			}
			node.removeAttribute(this.name);
			node.removeAttribute(jst_attr_prefix + "item-end");
			
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter.processorBegin){
				parameter.processorBegin($ctx, node);
			}
			return true;
		},
		cleanup: function($ctx, node, seq, result, parameter) {
			if(parameter.processorEnd){
				parameter.processorEnd($ctx, node);
			}
			return true;					
		}		
	});	
	directives.push({
		name: jst_attr_prefix + "html",
		compile: function($jst, node, result) {
			var nodeValue= node.getAttribute(this.name);
			if(nodeValue != null){
				result.parameters.push({directive: this, name: this.name, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(this.name); 
				node.removeAttribute(jst_attr_prefix + "text");
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
	});
	directives.push({
		name: jst_attr_prefix + "text",
		compile: function($jst, node, result) {
			var nodeValue= node.getAttribute(this.name);
			if(nodeValue != null){
				result.parameters.push({directive: this, name: this.name, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(this.name);
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
	});
	directives.push({
		name: "*",
		compile: function($jst, node, result) {
			var i, attrs = [], nodeName, nodeValue;
			for(i = 0; i < node.attributes.length; ++i){
				attrs.push(node.attributes[i].nodeName);
			}
			for(i=0; i < attrs.length; ++i){
				nodeName = attrs[i];
				if(directives.find(function(e){return e.name == nodeName}) === undefined){
					nodeValue = node.getAttribute(nodeName);
					if(nodeValue.match(REGEX_EXPRESSION)){
						result.parameters.push({directive: this, name: nodeName, processor: exec_value_function.create($jst, nodeValue) });
						node.removeAttribute(nodeName);
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
	});
	directives.push({
		name: jst_attr_prefix + "bind",
		compile: function($jst, node, result) {
			var nodeValue= node.getAttribute(this.name);
			if(nodeValue != null){
				result.parameters.push({directive: this, name: this.name, processor: exec_bind_function.create($jst, nodeValue) });
				node.removeAttribute(this.name);	
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
	});
	directives.push({
		name: jst_attr_prefix + "call",
		compile: function($jst, node, result) {
			var nodeValue= node.getAttribute(this.name);
			if(nodeValue != null){
				result.parameters.push({directive: this, name: this.name, processor: exec_call_function.create($jst, nodeValue) });
				node.removeAttribute(this.name);	
			}
			return true;
		},
		process: function($ctx, node, seq, result, parameter) {
			if(parameter.processor){
				parameter.processor($ctx, node);
			}
			return true;
		},
	});
	directives.push({
		name: jst_attr_prefix + "recursive",
		compile: function($jst, node, result) {
			var nodeValue= node.getAttribute(this.name);
			if(nodeValue != null){
				result.parameters.push({directive: this, name: this.name, processor: exec_value_function.create($jst, nodeValue) });
				node.removeAttribute(this.name);	
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
	});
	directives.push({
		name: jst_attr_prefix + "item-end"
	});
	directives.push({
		name: jst_attr_prefix + "end"
	});
	
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
			for(i =0; i < parts.length; ++i){
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
			//if(nodeName == "checked" && tagName == "input" && node.getAttribute("type").toLowerCase() == "radio" && nodeValue == true) {
			//	node.checked = true;
			//}
		},
		create: function(node) {
			jst.node.div.innerHTML = node.outerHTML;
			return jst.node.div.firstChild;
		},
		replace: function(node, repl) {
			node.parentNode.replaceChild(repl, node);
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
		var node, directive, seqno, n,	result;

		node = dom.childNodes[0];
		while(node) {
			if(node.nodeType == 3) {
				node = convert_text_node(node, preserveWhiteSpace);
			}
			if(node && node.nodeType == 1) {
				result = {parameters: []};
				for(n = 0; n < directives.length; ++ n){
					directive = directives[n];
					if(directive.compile && !directive.compile.call(directive, $jst, node, result)){
						break;
					}
				}
				seqno = 0;
				if(result.parameters.length > 0 ) {
					$jst.nodes[seq] = result;
					seqno = seq;
					node.setAttribute(tid, seq++);
				}
				if(n == directives.length){
					seq = compile($jst, node, preserveWhiteSpace, seq, tid);
				}
				if(seqno) {
					$jst.nodes[seqno]["dom"] = { outerHTML: node.outerHTML, innerHTML : node.innerHTML };
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
			if(data === undefined || data === null){
				data = "";
			}
			if(result.previousSibling.nodeType == 8){
				if(data !== ""){
					node = document.createTextNode(data);
					result.parentNode.insertBefore(node, result);
				}
			}else if(result.previousSibling.data != data) {
				node = document.createTextNode(data);
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

	//target.style.display = "node";
		process(ctx, target, 0);
	//target.style.display = "";
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