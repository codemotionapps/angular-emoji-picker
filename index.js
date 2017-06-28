/*!
 @package angular-emoji-picker - Slack like emoji selector with apple, twitter, google, emojione and custom emoji support.
 @contributors https://github.com/codemotionapps/angular-emoji-picker/graphs/contributors
 @license Licensed under the MIT licenses: http://www.opensource.org/licenses/mit-license.php
 */

const angular = require(`angular`);
const EmojiConvertor = require(`emoji-js`);

const generateId = (function(){
	let i = 0;
	return () => i++;
})();

const wdtEmojiBundle = {
	initialized: false,
	pickers: {},
	openedPicker: undefined,
	pickerFilled: false
};

wdtEmojiBundle.defaults = {
    pickerColors : ['green', 'pink', 'yellow', 'blue', 'gray'],
    textMode     : true,
    sectionOrders: {
      'People'  : 8,
      'Nature'  : 7,
      'Foods'   : 6,
      'Activity': 5,
      'Places'  : 4,
      'Objects' : 3,
      'Symbols' : 2,
      'Flags'   : 1
    },
    skinColor    : 'skin-1',
    allowNative  : false,
    emojiType: `twitter`,
    emojiSheets: {
		twitter: require(`emoji-datasource/img/twitter/sheets/32.png`)
    },
	emojiData: require(`emoji-datasource`)
};

wdtEmojiBundle.init = function(popup){
	if(this.initialized) return this;

	this.initialized = true;

    var self = this;

    self.emoji = new EmojiConvertor();

    self.emoji.allow_native = this.defaults.allowNative;
    self.emoji.img_set = this.defaults.emojiType;
    self.emoji.use_sheet = true;
    self.emoji.supports_css = true;
    self.emoji.img_sets['twitter']['sheet'] = this.defaults.emojiSheets.twitter;

    this.popup = popup;
    self.scroller = this.popup[0].querySelector('.wdt-emoji-scroll-wrapper');
    self.searchInput = this.popup[0].querySelector('#wdt-emoji-search');
    self.previewImg = this.popup[0].querySelector('#wdt-emoji-preview-img');
    self.previewName = this.popup[0].querySelector('#wdt-emoji-preview-name');
	this.sectionsContainer = this.popup[0].querySelector('.wdt-emoji-sections');

    document.querySelector('body').dataset.wdtEmojiBundle = wdtEmojiBundle.defaults.emojiType;

    var people = this.popup[0].querySelector('[data-group-name="People"]');
    if (people) people.innerHTML = this.emoji.replace_colons(':sunglasses:');

    var nature = this.popup[0].querySelector('[data-group-name="Nature"]');
    if (nature) nature.innerHTML = this.emoji.replace_colons(':shamrock:');

    var foods = this.popup[0].querySelector('[data-group-name="Foods"]');
    if (foods) foods.innerHTML = this.emoji.replace_colons(':pizza:');

    var activity = this.popup[0].querySelector('[data-group-name="Activity"]');
    if (activity) activity.innerHTML = this.emoji.replace_colons(':football:');

    var places = this.popup[0].querySelector('[data-group-name="Places"]');
    if (places) places.innerHTML = this.emoji.replace_colons(':airplane:');

    var objects = this.popup[0].querySelector('[data-group-name="Objects"]');
    if (objects) objects.innerHTML = this.emoji.replace_colons(':bulb:');

    var symbols = this.popup[0].querySelector('[data-group-name="Symbols"]');
    if (symbols) symbols.innerHTML = this.emoji.replace_colons(':heart:');

    var flags = this.popup[0].querySelector('[data-group-name="Flags"]');
    if (flags) flags.innerHTML = this.emoji.replace_colons(':waving_white_flag:');

    return this;
};

wdtEmojiBundle.add = function(field, picker){
	if(!this.initialized) throw "Picker not initialized";

	picker.on(`click`, event => {
		wdtEmojiBundle.openPicker(event, field, picker);
	});

	const id = generateId();

	field[0].dataset.pickerId = id;

	this.pickers[id] = {
		field,
		picker,
		open: false
	};
};


// @todo - [needim] - popup must be visible in viewport calculate carefully
function findBestAvailablePosition(el) {
	var bodyRect = document.body.getBoundingClientRect();
	var elRect = el.getBoundingClientRect();
	var popupRect = wdtEmojiBundle.popup[0].getBoundingClientRect();

	var pos = {
		left: (elRect.left - popupRect.width) + elRect.width,
		top: elRect.top + Math.abs(bodyRect.top) + elRect.height
	};

	pos.left = pos.left < 0 ? 0 : pos.left;

	pos.left += 'px';
	pos.top += 'px';

	if (bodyRect.width < 415) { // mobile specific @todo - [needim] - better mobile detection needed
		wdtEmojiBundle.popup.addClass(`wdt-emoji-mobile`);

		return {
			left: '0px',
			bottom: '0px',
			top: 'auto',
			width: '100%',
			position: 'fixed'
		};
	}

	return pos;
}

function repositionPopup(){
	css(wdtEmojiBundle.popup[0], findBestAvailablePosition(event.target));
}

wdtEmojiBundle.openPicker = function(event, field, pickerButton){
	const pickerId = field[0].dataset.pickerId;

	const picker = this.pickers[pickerId];

	if(picker.open){
		this.closePicker(picker);

		return this;
	}

    this.input = field[0];

    css(this.popup[0], findBestAvailablePosition(event.target));

    window.addEventListener(`resize`, repositionPopup);

    this.popup.addClass(`open`);

    this.fillPickerPopup();
	
	pickerButton.addClass(`wdt-emoji-picker-open`);
	picker.open = true;

	this.openedPicker = pickerId;

	return this;
};

wdtEmojiBundle.fillPickerPopup = function(){
    var self = this;

    if(this.pickerFilled) return this;

    var sections = {},
      sortedSections = [];

	// TODO: Turn into webpack loader (as much as possible)
	for(const i in wdtEmojiBundle.defaults.emojiData){
		const emoji = wdtEmojiBundle.defaults.emojiData[i];

		let category = emoji.category;
		if(category === 'Skin Tones') continue;
		if(!sections[category]) sections[category] = [];
		category = sections[category];

		delete emoji.category;
		category.push(emoji);
	}

	for(const i in sections){
		const category = sections[i];

		category.sort((a, b) => a.sort_order - b.sort_order);
	}

    var sortedSectionsArray = Object.keys(sections).sort(function (a, b) {
      return wdtEmojiBundle.defaults.sectionOrders[a] < wdtEmojiBundle.defaults.sectionOrders[b] ? 1 : -1;
    });

    for (var i = 0; i < sortedSectionsArray.length; i++) {
      sortedSections[sortedSectionsArray[i]] = sections[sortedSectionsArray[i]];
    }

    for (var title in sortedSections) {
      if (sortedSections.hasOwnProperty(title)) {
        var emojiList = sortedSections[title];

        if (emojiList.length) {
          var emojiSection = document.createElement('div'),
            emojiTitle = document.createElement('h3'),
            emojiListDiv = document.createElement('div');

          emojiTitle.innerHTML = title;
          emojiTitle.dataset.emojiGroup = title;
          emojiListDiv.dataset.emojiGroup = title;

          addClass(emojiListDiv, 'wdt-emoji-list');
          addClass(emojiSection, 'wdt-emoji-section');

          for (i = 0; i < emojiList.length; i++) {
            var em = emojiList[i];

            if (em.has_img_apple || em.has_img_emojione || em.has_img_google || em.has_img_twitter || em.has_img_facebook || em.has_img_messenger) {
              var emojiLink = document.createElement('a');

              addClass(emojiLink, 'wdt-emoji');
              addClass(emojiLink, wdtEmojiBundle.getRandomPickerColor());

              emojiLink.dataset.hasImgApple = em.has_img_apple;
              emojiLink.dataset.hasImgEmojione = em.has_img_emojione;
              emojiLink.dataset.hasImgGoogle = em.has_img_google;
              emojiLink.dataset.hasImgTwitter = em.has_img_twitter;
              emojiLink.dataset.hasImgFacebook = em.has_img_facebook;
              emojiLink.dataset.hasImgMessenger = em.has_img_messenger;
              emojiLink.dataset.wdtEmojiName = em.name;
              emojiLink.dataset.wdtEmojiShortnames = ':' + em.short_names.join(': :') + ':';
              emojiLink.dataset.wdtEmojiShortname = em.short_name;
              emojiLink.dataset.wdtEmojiOrder = em.sort_order;

              emojiLink.innerHTML = self.emoji.replace_colons(':' + em.short_name + ':');

              emojiListDiv.appendChild(emojiLink);
            }
          }

          emojiSection.appendChild(emojiTitle);
          emojiSection.appendChild(emojiListDiv);
          wdtEmojiBundle.sectionsContainer.appendChild(emojiSection);
        }
      }
    }

	this.pickerFilled = true;
    this.bindEvents();

	return this;
};


wdtEmojiBundle.getRandomPickerColor = function(){
    return wdtEmojiBundle.defaults.pickerColors[Math.floor(Math.random() * wdtEmojiBundle.defaults.pickerColors.length)];
};

wdtEmojiBundle.close = function(){
	if(this.openedPicker) this.closePicker(this.pickers[this.openedPicker]);

	return this;
};

wdtEmojiBundle.closePicker = function(picker){
	picker.picker.removeClass(`wdt-emoji-picker-open`);
	picker.open = false;
	this.openedPicker = undefined;
    this.popup.removeClass(`open`);
    window.removeEventListener(`resize`, repositionPopup);

	return this;
};

  /**
   * void function binds some events for the bundle
   */
  wdtEmojiBundle.bindEvents = function () {
    var self = this;
    var stickers = document.querySelectorAll('.wdt-emoji-section h3');
    if (stickers.length) {
      for (var i = 0; i < stickers.length; i++) {
        sticky(stickers[i]);
      }
    }

    live('click', '.wdt-emoji-list a.wdt-emoji', function () {
      var selection = getSelection(wdtEmojiBundle.input);

      replaceText(wdtEmojiBundle.input, selection, ':' + this.dataset.wdtEmojiShortname + ':');

      var ce = document.createEvent('Event');
      ce.initEvent('input', true, true);
      wdtEmojiBundle.input.dispatchEvent(ce);
      wdtEmojiBundle.close();

      return false;
    });

    live('click', '.wdt-emoji-popup-mobile-closer', () => wdtEmojiBundle.close());

	function liveExact(eventType, className, tagName, callback){
		wdtEmojiBundle.sectionsContainer.addEventListener(eventType, function(event){
			const target = event.target;
			if(target.tagName === tagName && target.className.indexOf(className) === 0) callback.apply(this, arguments);
		});
	}

    liveExact(`mouseover`, `wdt-emoji`, `a`, function(){
      if (wdtEmojiBundle.previewTimer)
        clearTimeout(wdtEmojiBundle.previewTimer);

      if (wdtEmojiBundle.previewExitTimer)
        clearTimeout(wdtEmojiBundle.previewExitTimer);

      var emo = this;

      wdtEmojiBundle.previewTimer = setTimeout(function(){

        wdtEmojiBundle.popup.addClass(`preview-mode`);

        wdtEmojiBundle.previewImg.innerHTML = self.emoji.replace_colons(':' + emo.dataset.wdtEmojiShortname + ':');
        wdtEmojiBundle.previewName.innerHTML = emo.dataset.wdtEmojiShortname;

      }, 100);

      return false;
    });

    liveExact(`mouseout`, `wdt-emoji`, `a`, function(){
      if (wdtEmojiBundle.previewExitTimer)
        clearTimeout(wdtEmojiBundle.previewExitTimer);

      wdtEmojiBundle.previewExitTimer = setTimeout(function () {
        wdtEmojiBundle.popup.removeClass(`preview-mode`);
      }, 1000);

      return false;
    });

    live('click', '.wdt-emoji-tab', function(){
      var group = this.dataset.groupName,
        groupHeader = wdtEmojiBundle.popup[0].querySelector('.wdt-emoji-section h3[data-emoji-group="' + group + '"]');

      if (groupHeader) {
        wdtEmojiBundle.setActiveTab(group);
        wdtEmojiBundle.scroller.scrollTop = groupHeader.offsetTop - groupHeader.getBoundingClientRect().height - 2;
      }
    });

    live('input', '#wdt-emoji-search', function(){
      var input = this;
      if (wdtEmojiBundle.searchTimer) {
        clearTimeout(wdtEmojiBundle.searchTimer);
      }

      wdtEmojiBundle.searchTimer = setTimeout(function () {
        wdtEmojiBundle.search(input.value);
      }, 225);
    });

    addListenerMulti(wdtEmojiBundle.scroller, 'mousewheel DOMMouseScroll', function(e) {
      var delta = e.wheelDelta || (e.originalEvent && e.originalEvent.wheelDelta) || -e.detail,
          bottomOverflow = this.scrollTop + this.getBoundingClientRect().height - this.scrollHeight >= 0,
          topOverflow = this.scrollTop <= 0;
      if ((delta < 0 && bottomOverflow) || (delta > 0 && topOverflow)) {
        e.preventDefault();
      }
    });
  };

  /**
   *
   * @param q
   * @returns {boolean}
   */
wdtEmojiBundle.search = function(q){
    var searchResultH3 = wdtEmojiBundle.popup[0].querySelector('#wdt-emoji-search-result-title'),
      emojiList = this.sectionsContainer.querySelectorAll('.wdt-emoji'),
      zeroText = wdtEmojiBundle.popup[0].querySelector('#wdt-emoji-no-result'),
      found = 0;

    if (q == '') {
      removeClass(searchResultH3, 'wdt-show');
      removeClass(zeroText, 'wdt-show');
      removeClassAll('.wdt-emoji.not-matched', 'not-matched');
      removeClassAll('.wdt-emoji-section', 'wdt-inline');
      removeClassAll('.wdt-emoji-list', 'wdt-inline');
      removeClassAll('.wdt-emoji-section h3', 'wdt-search-on');
      return false;
    }

    for (var i = 0; i < emojiList.length; i++) {
      var emo = emojiList[i];
      var sst = emo.dataset.wdtEmojiName + ' ' + emo.dataset.wdtEmojiShortnames;

      removeClass(emo, 'not-matched');
      if (sst.match(new RegExp(q, "gi"))) {
        found++;
      } else {
        addClass(emo, 'not-matched');
      }

    }

    addClass(searchResultH3, 'wdt-show');
    addClassAll('.wdt-emoji-section', 'wdt-inline');
    addClassAll('.wdt-emoji-list', 'wdt-inline');
    addClassAll('.wdt-emoji-section h3', 'wdt-search-on');

    if (found) {
      removeClass(zeroText, 'wdt-show');
    } else {
      addClass(zeroText, 'wdt-show');
    }
};

wdtEmojiBundle.render = function(text){
    return this.emoji.replace_colons(this.emoji.replace_emoticons(this.emoji.replace_unified(text)));
};

  /**
   *
   * @param el
   * @param events
   * @param cb
   */
  var addListenerMulti = function (el, events, cb) {
    events = events.split(' ');
    for (var i = 0; i < events.length; i++) {
      el.addEventListener(events[i], cb, false);
    }
  };

  /**
   * Stick section header controls
   * @param el
   */
  var sticky = function (el) {

    var scrollerRect = wdtEmojiBundle.scroller.getBoundingClientRect(),
      elTop = el.getBoundingClientRect().top - scrollerRect.top,
      tabHeaderHeight = wdtEmojiBundle.popup[0].querySelector('#wdt-emoji-menu-header').getBoundingClientRect().height;

    wdtEmojiBundle.scroller.addEventListener("scroll", check);

    function check() {
      var scrollTop = wdtEmojiBundle.scroller.scrollTop;

      if (hasClass(el, 'sticky') && scrollTop < elTop) {

        removeClass(el, 'sticky');
        css(el, {top: null});
        css(el.parentNode, {'padding-top': null});

      } else if (scrollTop > elTop && !hasClass(el, 'sticky')) {

        var stickers = document.querySelectorAll('.wdt-emoji-section h3');
        if (stickers.length) {
          for (var i = 0; i < stickers.length; i++) {
            removeClass(stickers[i], 'sticky');
            css(stickers[i], {top: null});
            css(stickers[i].parentNode, {'padding-top': null});
          }
        }

        addClass(el, 'sticky');
        css(el, {'top': tabHeaderHeight + 'px'});
        css(el.parentNode, {'padding-top': el.getBoundingClientRect().height + 'px'});

        wdtEmojiBundle.setActiveTab(el.dataset.emojiGroup);
      }
    }
  };

  /**
   *
   * @param group
   */
  wdtEmojiBundle.setActiveTab = function (group) {
    var tabs = document.querySelectorAll('.wdt-emoji-tab');
    if (tabs.length) {
      for (var t = 0; t < tabs.length; t++) {
        removeClass(tabs[t], 'active');
      }
    }

    var activeTab = wdtEmojiBundle.popup[0].querySelector('.wdt-emoji-tab[data-group-name="' + group + '"]');
    addClass(activeTab, 'active');
  };

  /**
   *
   * @param el
   * @returns {*}
   */
  var getSelection = function (el) {
    var result = {};

    if (el.getAttribute('contenteditable')) {
      return {
        el: el,
        ce: true
      };
    }

    if (window.getSelection) {
      var val = el.value || el.innerHTML,
        len = val.length,
        start = el.selectionStart,
        end = el.selectionEnd,
        sel = val.substring(start, end);

      result = {
        "el"   : el,
        "start": start,
        "end"  : end,
        "len"  : len,
        "sel"  : sel
      };
    }
    else if (document.selection) { // ie
      var range = document.selection.createRange(),
        value = el.value || el.innerHTML,
        stored_range = range.duplicate();

      stored_range.moveToElementText(el);
      stored_range.setEndPoint('EndToEnd', range);
      el.selectionStart = stored_range.text.length - range.text.length;
      el.selectionEnd = el.selectionStart + range.text.length;

      result = {
        "el"   : el,
        "start": el.selectionStart,
        "end"  : el.selectionEnd,
        "len"  : value.length,
        "sel"  : range.text
      };
    }

    return result;
  };

    /**
   * Replace selection text for :input
   *
   * @param el
   * @param selection
   * @param emo
   */
  var replaceText = function (el, selection, emo) {
    var val = el.value || el.innerHTML || '';
    emo = emo + ' '; //append a space

    if (selection.ce) { // if contenteditable
      el.focus();
      document.execCommand('insertText', false, emo);
    } else {
      var textBefore = val.substring(0, selection.start);
      textBefore = textBefore.replace(/:\S*$/, '');
      el.value = textBefore + emo + val.substring(selection.end, selection.len);

      // @todo - [needim] - check browser compatibilities
      el.selectionStart = el.selectionEnd = (textBefore.length + emo.length);
      el.focus();
    }
  }; 

var live = function(eventType, elementQuerySelector, cb){
    document.addEventListener(eventType, function (event) {

		var qs = document.querySelectorAll(elementQuerySelector);

        var el = event.target, index = -1;
        while (el && ((index = Array.prototype.indexOf.call(qs, el)) === -1)) {
          el = el.parentElement;
        }

        if (index > -1) {
          cb.call(el, event);
        }
    });
};

  /**
   * Applies css properties to an element, similar to the jQuery
   * css method.
   *
   * While this helper does assist with vendor prefixed property names, it
   * does not perform any manipulation of values prior to setting styles.
   */
  var css = (function () {
    var cssPrefixes = ['Webkit', 'O', 'Moz', 'ms'],
      cssProps = {};

    function camelCase(string) {
      return string.replace(/^-ms-/, 'ms-').replace(/-([\da-z])/gi, function (match, letter) {
        return letter.toUpperCase();
      });
    }

    function getVendorProp(name) {
      var style = document.body.style;
      if (name in style) return name;

      var i = cssPrefixes.length,
        capName = name.charAt(0).toUpperCase() + name.slice(1),
        vendorName;
      while (i--) {
        vendorName = cssPrefixes[i] + capName;
        if (vendorName in style) return vendorName;
      }

      return name;
    }

    function getStyleProp(name) {
      name = camelCase(name);
      return cssProps[name] || (cssProps[name] = getVendorProp(name));
    }

    function applyCss(element, prop, value) {
      prop = getStyleProp(prop);
      element.style[prop] = value;
    }

    return function (element, properties) {
      var args = arguments,
        prop,
        value;

      if (args.length == 2) {
        for (prop in properties) {
          value = properties[prop];
          if (value !== undefined && properties.hasOwnProperty(prop)) applyCss(element, prop, value);
        }
      } else {
        applyCss(element, args[1], args[2]);
      }
    };
  })();

  /**
   *
   * @param element
   * @param name
   * @returns {boolean}
   */
  function hasClass(element, name) {
    var list = typeof element == 'string' ? element : classList(element);
    return list.indexOf(' ' + name + ' ') >= 0;
  }

  /**
   *
   * @param element
   * @param name
   */
  function addClass(element, name) {
    var oldList = classList(element),
      newList = oldList + name;

    if (hasClass(oldList, name)) return;

    // Trim the opening space.
    element.className = newList.substring(1);
  }

  /**
   *
   * @param query
   * @param name
   */
  function addClassAll(query, name) {

    var elements = document.querySelectorAll(query);

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];

      var oldList = classList(element),
        newList = oldList + name;

      if (hasClass(oldList, name)) return;

      // Trim the opening space.
      element.className = newList.substring(1);
    }
  }

  /**
   *
   * @param element
   * @param name
   */
  function removeClass(element, name) {
    var oldList = classList(element),
      newList;

    if (!hasClass(element, name)) return;

    // Replace the class name.
    newList = oldList.replace(' ' + name + ' ', ' ');

    // Trim the opening and closing spaces.
    element.className = newList.substring(1, newList.length - 1);
  }

  /**
   *
   * @param query
   * @param name
   */
  function removeClassAll(query, name) {

    var elements = document.querySelectorAll(query);

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];

      var oldList = classList(element),
        newList;

      if (!hasClass(element, name)) return;

      // Replace the class name.
      newList = oldList.replace(' ' + name + ' ', ' ');

      // Trim the opening and closing spaces.
      element.className = newList.substring(1, newList.length - 1);
    }
  }

  /**
   *
   * @param element
   * @returns {string}
   */
  function classList(element) {
    return (' ' + (element && element.className || '') + ' ').replace(/\s+/gi, ' ');
  }

function emojiPopup(){
	return {
		restrict: `A`,
		link(scope, element){
			wdtEmojiBundle.init(element);
		}
	};
}

function emojiParent(){
	function controller(){
		let field, picker;

		function init(){
			if(!(field && picker)) return;

			wdtEmojiBundle.add(field, picker);
		}

		this.field = function(element){
			field = element;
			init();
		};

		this.picker = function(element){
			picker = element;
			init();
		};
	}

	return {
		restrict: `A`,
		controller
	};
}

function emojiField(){
	return {
		restrict: `A`,
		require: `^emojiParent`,
		link(scope, element, attrs, emojiParentController){
			emojiParentController.field(element);
		}
	};
}

function emojiPicker(){
	return {
		restrict: `A`,
		require: `^emojiParent`,
		link(scope, element, attrs, emojiParentController){
			emojiParentController.picker(element);
		}
	};
}

function emoji(){
	this.render = text => wdtEmojiBundle.render(text);
}

const moduleName = `angular-emoji-picker`;

angular.module(moduleName, [])
	.directive(`emojiPicker`, emojiPicker)
	.directive(`emojiField`, emojiField)
	.directive(`emojiParent`, emojiParent)
	.directive(`emojiPopup`, emojiPopup)
	.service(`Emoji`, emoji);

module.exports = moduleName;