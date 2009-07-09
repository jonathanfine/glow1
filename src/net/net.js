/**
@name glow.net
@namespace
@description Sending data to & from the server
@see <a href="../furtherinfo/net/net.shtml">Using glow.net</a>
*/
(window.gloader || glow).module({
	name: "glow.net",
	library: ["glow", "@VERSION@"],
	depends: [["glow", "@VERSION@", "glow.data", "glow.events"]],
	builder: function(glow) {
		//private

		var STR = {
				XML_ERR:"Cannot get response as XML, check the mime type of the data",
				POST_DEFAULT_CONTENT_TYPE:'application/x-www-form-urlencoded;'
			},
			/**
			 * @name glow.net.scriptElements
			 * @private
			 * @description Script elements that have been added via {@link glow.net.loadScript loadScript}
			 * @type Array
			 */
			scriptElements = [],
			/**
			 * @name glow.net.callbackPrefix
			 * @private
			 * @description Callbacks in _jsonCbs will be named this + a number
			 * @type String
			 */
			callbackPrefix = "c",
			/**
			 * @name glow.net.globalObjectName
			 * @private
			 * @description Name of the global object used to store loadScript callbacks
			 * @type String
			 */
			globalObjectName = "_" + glow.UID + "loadScriptCbs",
			events = glow.events,
			emptyFunc = function(){};

		/**
		 * @name glow.net.xmlHTTPRequest
		 * @private
		 * @function
		 * @description Creates an xmlHTTPRequest transport
		 * @returns Object
		 */
		function xmlHTTPRequest() {
			//try IE first. IE7's xmlhttprequest and XMLHTTP6 are broken. Avoid avoid avoid!
			if (window.ActiveXObject) {
				return (xmlHTTPRequest = function() { return new ActiveXObject("MSXML2.XMLHTTP"); })();
			} else {
				return (xmlHTTPRequest = function() { return new XMLHttpRequest(); })();
			}
		}

		/**
		 * @name glow.net.populateOptions
		 * @private
		 * @function
		 * @description Adds defaults to get / post option object
		 * @param {Object} opts Object to add defaults to
		 * @returns Object
		 */
		function populateOptions(opts) {
			return glow.lang.apply(
				{
					onLoad: emptyFunc,
					onError: emptyFunc,
					onAbort: emptyFunc,
					headers: {},
					async: true,
					useCache: false,
					data: null,
					defer: false
				},
				opts || {}
			);
		}

		/*
		PrivateMethod: noCacheUrl
			Adds random numbers to the querystring of a url so the browser doesn't use a cached version
		*/

		function noCacheUrl(url) {
			return [url, (/\?/.test(url) ? "&" : "?"), "a", new Date().getTime(), parseInt(Math.random()*100000)].join("");
		}

		/*
		PrivateMethod: makeXhrRequest
			Makes an http request
		*/
		/**
		 * @name glow.net.makeXhrRequest
		 * @private
		 * @function
		 * @description Makes an xhr http request
		 * @param {String} method HTTP Method
		 * @param {String} url URL of the request
		 * @param {Object} Options, see options for {@link glow.net.get}
		 * @returns Object
		 */
		function makeXhrRequest(method, url, opts) {
			var req = xmlHTTPRequest(), //request object
				data = opts.data && (typeof opts.data == "string" ? opts.data : glow.data.encodeUrl(opts.data)),
				i,
				request = new Request(req, opts);

			if (!opts.useCache) {
				url = noCacheUrl(url);
			}

			//open needs to go first to maintain cross-browser support for readystates
			req.open(method, url, opts.async);

			//add custom headers
			for (i in opts.headers) {
				req.setRequestHeader(i, opts.headers[i]);
			}

			function send() {
				request.send = emptyFunc;
				if (opts.async) {
					//sort out the timeout if there is one
					if (opts.timeout) {
						request._timeout = setTimeout(function() {
							abortRequest(request);
							var response = new Response(req, true);
							events.fire(request, "error", response);
						}, opts.timeout * 1000);
					}

					req.onreadystatechange = function() {
						if (req.readyState == 4) {
							//clear the timeout
							request._timeout && clearTimeout(request._timeout);
							//set as completed
							request.completed = true;
							var response = new Response(req);
							if (response.wasSuccessful) {
								events.fire(request, "load", response);
							} else {
								events.fire(request, "error", response);
							}
						}
					};
					req.send(data);
					return request;
				} else {
					req.send(data);
					request.completed = true;
					var response = new Response(req);
					if (response.wasSuccessful) {
						events.fire(request, "load", response);
					} else {
						events.fire(request, "error", response);
					}
					return response;
				}
			}

			request.send = send;
			return opts.defer ? request : send();
		}

		//public
		var r = {}; //the module

		/**
		@name glow.net.get
		@function
		@description Makes an HTTP GET request to a given url

		@param {String} url
			Url to make the request to. This can be a relative path. You cannot make requests
			for files on other domains, to do that you must put your data in a javascript
			file and use {@link glow.net.loadScript} to fetch it.
		@param {Object} opts
			Options Object of options.
			@param {Function} [opts.onLoad] Callback to execute when the request has sucessfully loaded
				The callback is passed a Response object as its first parameter.
			@param {Function} [opts.onError] Callback to execute if the request was unsucessful
				The callback is passed a Response object as its first parameter.
				This callback will also be run if a request times out.
			@param {Function} [opts.onAbort] Callback to execute if the request is aborted
			@param {Object} [opts.headers] A hash of headers to send along with the request
				Eg {"Accept-Language": "en-gb"}
			@param {Boolean} [opts.async=true] Should the request be performed asynchronously?
			@param {Boolean} [opts.useCache=false] Allow a cached response
				If false, a random number is added to the query string to ensure a fresh version of the file is being fetched
			@param {Number} [opts.timeout] Time to allow for the request in seconds
				No timeout is set by default. Only applies for async requests. Once
				the time is reached, the error event will fire with a "408" status code.
			@param {Boolean} [opts.defer=false] Do not send the request straight away
				Deferred requests need to be triggered later using myRequest.send()

		@returns {glow.net.Request|glow.net.Response}
			A response object for non-defered sync requests, otherwise a
			request object is returned

		@example
			var request = glow.net.get("myFile.html", {
				onLoad: function(response) {
					alert("Got file:\n\n" + response.text());
				},
				onError: function(response) {
					alert("Error getting file: " + response.statusText());
				}
			});
		*/
		r.get = function(url, o) {
			o = populateOptions(o);
			return makeXhrRequest('GET', url, o);
		};

		/**
		@name glow.net.post
		@function
		@description Makes an HTTP POST request to a given url

		@param {String} url
			Url to make the request to. This can be a relative path. You cannot make requests
			for files on other domains, to do that you must put your data in a javascript
			file and use {@link glow.net.loadScript} to fetch it.
		@param {Object|String} data
			Data to post, either as a JSON-style object or a urlEncoded string
		@param {Object} opts
			Same options as {@link glow.net.get}

		@returns {Number|glow.net.Response}
			An integer identifying the async request, or the response object for sync requests

		@example
			var postRef = glow.net.post("myFile.html",
				{key:"value", otherkey:["value1", "value2"]},
				{
					onLoad: function(response) {
						alert("Got file:\n\n" + response.text());
					},
					onError: function(response) {
						alert("Error getting file: " + response.statusText());
					}
				}
			);
		*/
		r.post = function(url, data, o) {
			o = populateOptions(o);
			o.data = data;
			if (!o.headers["Content-Type"]) {
				o.headers["Content-Type"] = STR.POST_DEFAULT_CONTENT_TYPE;
			}
			return makeXhrRequest('POST', url, o);
		};

		/**
		@name glow.net.loadScript
		@function
		@description Loads data by adding a script element to the end of the page
			This can be used cross domain, but should only be used with trusted
			sources as any javascript included in the script will be executed.

		@param {String} url
			Url of the script. Use "{callback}" in the querystring as the callback
			name if the data source supports it, then you can use the options below
		@param {Object} [opts]
			An object of options to use if "{callback}" is specified in the url.
			@param {Function} [opts.onLoad] Called when loadScript succeeds.
				The parameters are passed in by the external data source
			@param {Function} [opts.onError] Called on timeout
				No parameters are passed
			@param {Function} [opts.onAbort] Called if the request is aborted
			@param {Boolean} [opts.useCache=false] Allow a cached response
			@param {Number} [opts.timeout] Time to allow for the request in seconds
			@param {String} [opts.charset] Charset attribute value for the script

		@returns {glow.net.Request}

		@example
			glow.net.loadScript("http://www.server.com/json/tvshows.php?jsoncallback={callback}", {
				onLoad: function(data) {
					alert("Data loaded");
				}
			});
		*/
		r.loadScript = function(url, opts) {
			//id of the request
			opts = populateOptions(opts);
		    url = opts.useCache ? url : noCacheUrl(url);

			var newIndex = scriptElements.length,
				//script element that gets inserted on the page
				script,
				//generated name of the callback, may not be used
				callbackName = callbackPrefix + newIndex,
				request = new Request(newIndex, opts),
				//the global property used to hide callbacks
				globalObject = window[globalObjectName] || (window[globalObjectName] = {});

			//assign onload
			if (opts.onLoad) {
				globalObject[callbackName] = function() {
					//clear the timeout
					request._timeout && clearTimeout(request._timeout);
					//set as completed
					request.completed = true;
					opts.onLoad.apply(this, arguments);
					// cleanup
					glow.dom.get(script).destroy();
					// clean up references to prevent leaks
					script = scriptElements[newIndex] = globalObject[callbackName] = undefined;
					delete globalObject[callbackName];
					delete scriptElements[newIndex];
				};
				url = glow.lang.interpolate(url, {callback: globalObjectName + "." + callbackName});
			}

			script = scriptElements[newIndex] = document.createElement("script");

			if (opts.charset) {
				script.charset = opts.charset;
			}

			//add abort event
			events.addListener(request, "abort", opts.onAbort);

			glow.ready(function() {
				//sort out the timeout
				if (opts.timeout) {
					request._timeout = setTimeout(function() {
						abortRequest(request);
						opts.onError();
					}, opts.timeout * 1000);
				}
				//using setTimeout to stop Opera 9.0 - 9.26 from running the loaded script before other code
				//in the current script block
				if (glow.env.opera) {
					setTimeout(function() {
						if (script) { //script may have been removed already
							script.src = url;
						}
					}, 0);
				} else {
					script.src = url;
				}
				//add script to page
				document.body.appendChild(script);
			});

			return request;
		};

		/**
		 *	@name glow.net.abortRequest
		 *	@private
		 *	@function
		 *	@description Aborts the request
		 *		Doesn't trigger any events
		 *
		 *	@param {glow.net.Request} req Request Object
		 *	@returns this
		 */
		function abortRequest(req) {
			var nativeReq = req.nativeRequest,
				callbackIndex = req._callbackIndex;

			//clear timeout
			req._timeout && clearTimeout(req._timeout);
			//different if request came from loadScript
			if (nativeReq) {
				//clear listeners
				nativeReq.onreadystatechange = emptyFunc;
				nativeReq.abort();
			} else if (callbackIndex) {
				//clear callback
				window[globalObjectName][callbackPrefix + callbackIndex] = emptyFunc;
				//remove script element
				glow.dom.get(scriptElements[callbackIndex]).destroy();
			}
		}

		/**
		 * @name glow.net.Request
		 * @class
		 * @description Returned by {@link glow.net.post post}, {@link glow.net.get get} async requests and {@link glow.net.loadScript loadScript}
		 * @glowPrivateConstructor There is no direct constructor, since {@link glow.net.post post} and {@link glow.net.get get} create the instances.
		 */

		/**
		 * @name glow.net.Request#event:load
		 * @event
		 * @param {glow.events.Event} event Event Object
		 * @description Fired when the request is sucessful
		 *   For a get / post request, this will be fired when request returns
		 *   with an HTTP code of 2xx. loadScript requests will fire 'load' only
		 *   if {callback} is used in the URL.
		 */

		/**
		 * @name glow.net.Request#event:abort
		 * @event
		 * @param {glow.events.Event} event Event Object
		 * @description Fired when the request is aborted
		 *   If you cancel the default (eg, by returning false) the request
		 *   will continue.
		 * @description Returned by {@link glow.net.post glow.net.post}, {@link glow.net.get glow.net.get} async requests and {@link glow.net.loadScript glow.net.loadScript}
		 * @see <a href="../furtherinfo/net/net.shtml">Using glow.net</a>
		 * @glowPrivateConstructor There is no direct constructor, since {@link glow.net.post glow.net.post} and {@link glow.net.get glow.net.get} create the instances.
		 */

		/**
		 * @name glow.net.Request#event:error
		 * @event
		 * @param {glow.events.Event} event Event Object
		 * @description Fired when the request is unsucessful
		 *   For a get/post request, this will be fired when request returns
		 *   with an HTTP code which isn't 2xx or the request times out. loadScript
		 *   calls will fire 'error' only if the request times out.
		 */


		/*
		 We don't want users to create instances of this class, so the constructor is documented
		 out of view of jsdoc

		 @param {Object} requestObj
			Object which represents the request type.
			For XHR requests it should be an XmlHttpRequest object, for loadScript
			requests it should be a number, the Index of the callback in glow.net._jsonCbs
		 @param {Object} opts
			Zero or more of the following as properties of an object:
			@param {Function} [opts.onLoad] Called when the request is sucessful
			@param {Function} [opts.onError] Called when a request is unsucessful
			@param {Function} [opts.onAbort] Called when a request is aborted

		*/
		function Request(requestObj, opts) {
			/**
			 * @name glow.net.Request#_timeout
			 * @private
			 * @description timeout ID. This is set by makeXhrRequest or loadScript
			 * @type Number
			 */
			this._timeout = null;
			/**
			 * @name glow.net.Request#complete
			 * @description Boolean indicating whether the request has completed
			 * @example
				// request.complete with an asynchronous call
				var request = glow.net.get(
					"myFile.html",
					{
						async: true,
						onload: function(response) {
							alert(request.complete); // returns true
						}
					}
				);
				alert(request.complete); // returns boolean depending on timing of asynchronous call

				// request.complete with a synchronous call
				var request = glow.net.get("myFile.html", {async: false;});
				alert(request.complete); // returns true
			 * @type Boolean
			 */
			this.complete = false;

			if (typeof requestObj == "number") {
				/**
				 * @name glow.net.Request#_callbackIndex
				 * @private
				 * @description Index of the callback in glow.net._jsonCbs
				 *   This is only relavent for requests made via loadscript using the
				 *   {callback} placeholder
				 * @type Number
				 */
				this._callbackIndex = requestObj;
			} else {
				/**
				 * @name glow.net.Request#nativeRequest
				 * @description The request object from the browser.
				 *   This may not have the same properties and methods across user agents.
				 *   Also, this will be undefined if the request originated from loadScript.
				 * @example
				var request = glow.net.get(
					"myFile.html",
					{
						async: true,
						onload: function(response) {
							alert(request.NativeObject); // returns Object()
						}
					}
				);
				 * @type Object
				 */
				this.nativeRequest = requestObj;
			}

			//assign events
			var eventNames = ["Load", "Error", "Abort"], i=0;

			for (; i < 3; i++) {
				events.addListener(this, eventNames[i].toLowerCase(), opts["on" + eventNames[i]]);
			}

		}
		Request.prototype = {
			/**
			@name glow.net.Request#send
			@function
			@description Sends the request.
				This is done automatically unless the defer option is set
			@example
				var request = glow.net.get(
					"myFile.html",
					{
						onload : function(response) {alert("Loaded");},
						defer: true
					}
				);
				request.send(); // returns "Loaded"
			@returns {Object}
				This for async requests or a response object for sync requests
			*/
			//this function is assigned by makeXhrRequest
			send: function() {},
			/**
			 *	@name glow.net.Request#abort
			 *	@function
			 *	@description Aborts an async request
			 *		The load & error events will not fire. If the request has been
			 *		made using {@link glow.net.loadScript loadScript}, the script
			 *		may still be loaded but	the callback will not be fired.
			 * @example
				var request = glow.net.get(
					"myFile.html",
					{
						async: true,
						defer: true,
						onabort: function() {
							alert("Something bad happened.  The request was aborted.");
						}
					}
				);
				request.abort(); // returns "Something bad happened.  The request was aborted"
			 *	@returns this
			 */
			abort: function() {
				if (!this.completed && !events.fire(this, "abort").defaultPrevented()) {
					abortRequest(this);
				}
				return this;
			}
		};

		/**
		@name glow.net.Response
		@class
		@description Provided in callbacks to {@link glow.net.post glow.net.post} and {@link glow.net.get glow.net.get}
		@see <a href="../furtherinfo/net/net.shtml">Using glow.net</a>

		@glowPrivateConstructor There is no direct constructor, since {@link glow.net.post glow.net.post} and {@link glow.net.get glow.net.get} create the instances.
		*/
		/*
		 These params are hidden as we don't want users to try and create instances of this...

		 @param {XMLHttpRequest} nativeResponse
		 @param {boolean} [timedOut=false]
		*/
		function Response(nativeResponse, timedOut) {
			//run Event constructor
			events.Event.call(this);

			/**
			@name glow.net.Response#nativeResponse
			@description The response object from the browser.
				This may not have the same properties and methods across user agents.
			@type Object
			*/
			this.nativeResponse = nativeResponse;
			/**
			@name glow.net.Response#status
			@description HTTP status code of the response
			@type Number
			*/
			//IE reports status as 1223 rather than 204, for laffs
			this.status = timedOut ? 408 :
				nativeResponse.status == 1223 ? 204 : nativeResponse.status;

			/**
			 * @name glow.net.Response#timedOut
			 * @description Boolean indicating if the requests time out was reached.
			 * @type Boolean
			 */
			this.timedOut = !!timedOut;

			/**
			 * @name glow.net.Response#wasSuccessful
			 * @description  Boolean indicating if the request returned successfully.
			 * @type Boolean
			 */
			this.wasSuccessful = (this.status >= 200 && this.status < 300) ||
				//from cache
				this.status == 304 ||
				//watch our for requests from file://
				(this.status == 0 && nativeResponse.responseText);

		}
		//don't want to document this inheritance, it'll just confuse the user
		glow.lang.extend(Response, events.Event, {
			/**
			@name glow.net.Response#text
			@function
			@description Gets the body of the response as plain text
			@returns {String}
				Response as text
			*/
			text: function() {
				return this.nativeResponse.responseText;
			},
			/**
			@name glow.net.Response#xml
			@function
			@description Gets the body of the response as xml
			@returns {xml}
				Response as XML
			*/
			xml: function() {
				if (!this.nativeResponse.responseXML) {
					throw new Error(STR.XML_ERR);
				}
				return this.nativeResponse.responseXML;
			},

			/**
			@name glow.net.Response#json
			@function
			@description Gets the body of the response as a json object

			@param {Boolean} [safeMode=false]
				If true, the response will be parsed using a string parser which
				will filter out non-JSON javascript, this will be slower but
				recommended if you do not trust the data source.

			@returns {Object}
			*/
			json: function(safe) {
				return glow.data.decodeJson(this.text(), {safeMode:safe});
			},

			/**
			@name glow.net.Response#header
			@function
			@description Gets a header from the response

			@param {String} name
				Header name

			@returns {String}
				Header value

			@example var contentType = myResponse.header("Content-Type");
			*/
			header: function(name) {
				return this.nativeResponse.getResponseHeader(name);
			},

			/**
			@name glow.net.Response#statusText
			@function
			@description Gets the meaning of {@link glow.net.Response#status myResponse.status}

			@returns {String}
			*/
			statusText: function() {
				return this.timedOut ? "Request Timeout" : this.nativeResponse.statusText;
			}
        });

		glow.net = r;
	}
});

