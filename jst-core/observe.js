(function(){
	
	if(!(Object.defineProperty && jst)){ //IE9+
		return;
	}
	
	function observe(obj, callback) {
		var typename = Object.prototype.toString.call(obj);
		if(typename === '[object Array]') {
			observeArray(obj, callback);
		}else if (typename === '[object Object]') {
			observeObject(obj, callback);
		}
	}
	
	observe.exceptions = [Function, Window, Navigator, Screen, History, Location, RegExp];

	window.observe = observe;
	
	function observeObject(obj, callback){
		Object.keys(obj).forEach(function(key){
			observeProperty(obj, key, callback);
		});
	}

	function observeProperty(obj, k, callback) {
		var old = obj[k];
		if(observe.exceptions.find(function(e){return old instanceof e}) == undefined){
			Object.defineProperty(obj, k, {
				enumerable: true,
				configurable: false,//prevent redefine
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
	
	var oam = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
	var arrayProto = Array.prototype;
	var hackProto = Object.create(Array.prototype);
	oam.forEach(function(method){
		hackProto[method] = function() {
			var result = arrayProto[method].apply(this, Array.prototype.slice.call(arguments));
			this.__oberver_callback();
			return  result;
		}
	});
	hackProto["item"] = function(i, v){
		if(this[i] != v){
			observe(v, this.__oberver_callback);
			this[i] = v;
			this.__oberver_callback();
		}
	};

	function observeArray(arr, callback) {
		//for (var i = 0, l = arr.length; i < l; i++) {
		//	observe(arr[i], callback);
		//}
		if(!arr.__oberver_callback){
			arr.__proto__ = hackProto;
		}
		arr.__oberver_callback = callback;
	}
	
	jst.prototype.watch = function(data){
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
})();
