/*!
 @package angular-emoji-picker
 @description Slack like emoji selector.
 @contributors https://github.com/codemotionapps/angular-emoji-picker/graphs/contributors
 @license Licensed under the MIT licenses: http://www.opensource.org/licenses/mit-license.php
 */

const angular = require(`angular`);
const EmojiConvertor = require(`emoji-js`);

const generateId = (function(){
	let i = 0;
	return () => i++;
}());

const wdtEmojiBundle = {
	initialized: false,
	pickers: {},
	pickerFilled: false
};

wdtEmojiBundle.defaults = {
	pickerColors: [`green`, `pink`, `yellow`, `blue`, `gray`],
	textMode: true,
	sectionOrders: {
		People: 8,
		Nature: 7,
		Foods: 6,
		Activity: 5,
		Places: 4,
		Objects: 3,
		Symbols: 2,
		Flags: 1
	},
	skinColor: `skin-1`,
	allowNative: false,
	emojiType: `twitter`,
	emojiSheets: {
		twitter: require(`emoji-datasource/img/twitter/sheets/32.png`)
	},
	emojiData: require(`emoji-datasource`)
};

wdtEmojiBundle.init = function(popup){
	if(this.initialized) return this;

	this.initialized = true;

	this.emoji = new EmojiConvertor();

	this.emoji.allow_native = this.defaults.allowNative;
	this.emoji.img_set = this.defaults.emojiType;
	this.emoji.use_sheet = true;
	this.emoji.supports_css = true;
	this.emoji.img_sets.twitter.sheet = this.defaults.emojiSheets.twitter;

	this.popup = popup;
	this.scroller = this.popup[0].querySelector(`.wdt-emoji-scroll-wrapper`);
	this.searchInput = this.popup[0].querySelector(`#wdt-emoji-search`);
	this.previewImg = this.popup[0].querySelector(`#wdt-emoji-preview-img`);
	this.previewName = this.popup[0].querySelector(`#wdt-emoji-preview-name`);
	this.previewAliases = this.popup[0].querySelector(`#wdt-emoji-preview-aliases`);
	this.sectionsContainer = this.popup[0].querySelector(`.wdt-emoji-sections`);

	document.querySelector(`body`).dataset.wdtEmojiBundle = wdtEmojiBundle.defaults.emojiType;

	const people = this.popup[0].querySelector(`[data-group-name="People"]`);
	if(people) people.innerHTML = this.emoji.replace_colons(`:sunglasses:`);

	const nature = this.popup[0].querySelector(`[data-group-name="Nature"]`);
	if(nature) nature.innerHTML = this.emoji.replace_colons(`:shamrock:`);

	const foods = this.popup[0].querySelector(`[data-group-name="Foods"]`);
	if(foods) foods.innerHTML = this.emoji.replace_colons(`:pizza:`);

	const activity = this.popup[0].querySelector(`[data-group-name="Activity"]`);
	if(activity) activity.innerHTML = this.emoji.replace_colons(`:football:`);

	const places = this.popup[0].querySelector(`[data-group-name="Places"]`);
	if(places) places.innerHTML = this.emoji.replace_colons(`:airplane:`);

	const objects = this.popup[0].querySelector(`[data-group-name="Objects"]`);
	if(objects) objects.innerHTML = this.emoji.replace_colons(`:bulb:`);

	const symbols = this.popup[0].querySelector(`[data-group-name="Symbols"]`);
	if(symbols) symbols.innerHTML = this.emoji.replace_colons(`:heart:`);

	const flags = this.popup[0].querySelector(`[data-group-name="Flags"]`);
	if(flags) flags.innerHTML = this.emoji.replace_colons(`:waving_white_flag:`);

	return this;
};

wdtEmojiBundle.add = function(field, picker){
	if(!this.initialized) throw new Error(`Picker not initialized`);

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
function findBestAvailablePosition(el){
	const bodyRect = document.body.getBoundingClientRect();
	const elRect = el.getBoundingClientRect();
	const popupRect = wdtEmojiBundle.popup[0].getBoundingClientRect();

	const pos = {
		left: (elRect.left - popupRect.width) + elRect.width,
		top: elRect.top + Math.abs(bodyRect.top) + elRect.height
	};

	pos.left = pos.left < 0 ? 0 : pos.left;

	pos.left += `px`;
	pos.top += `px`;

	if(bodyRect.width < 415){ // mobile specific @todo - [needim] - better mobile detection needed
		wdtEmojiBundle.popup.addClass(`wdt-emoji-mobile`);

		return {
			left: `0px`,
			bottom: `0px`,
			top: `auto`,
			width: `100%`,
			position: `fixed`
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
	const self = this;

	if(this.pickerFilled) return this;

	const sections = {};
	const sortedSections = [];

	// TODO: Turn into webpack loader (as much as possible)
	for(const i in wdtEmojiBundle.defaults.emojiData){ // eslint-disable-line guard-for-in
		const emoji = wdtEmojiBundle.defaults.emojiData[i]; // eslint-disable-line no-shadow

		let category = emoji.category;
		if(category === `Skin Tones`) continue;
		if(!sections[category]) sections[category] = [];
		category = sections[category];

		delete emoji.category;
		category.push(emoji);
	}

	for(const i in sections){ // eslint-disable-line guard-for-in
		const category = sections[i];

		category.sort((a, b) => a.sort_order - b.sort_order);
	}

	const sortedSectionsArray = Object.keys(sections).sort(function(a, b){
		return wdtEmojiBundle.defaults.sectionOrders[a] < wdtEmojiBundle.defaults.sectionOrders[b] ? 1 : -1;
	});

	for(const i in sortedSectionsArray){ // eslint-disable-line guard-for-in
		sortedSections[sortedSectionsArray[i]] = sections[sortedSectionsArray[i]];
	}

	for(const title in sortedSections){ // eslint-disable-line guard-for-in
		const emojiList = sortedSections[title];

		if(!emojiList.length) continue;

		const emojiSection = document.createElement(`div`);
		const emojiTitle = document.createElement(`h3`);
		const emojiListDiv = document.createElement(`div`);

		emojiTitle.innerHTML = title;
		emojiTitle.dataset.emojiGroup = title;
		emojiListDiv.dataset.emojiGroup = title;

		addClass(emojiListDiv, `wdt-emoji-list`);
		addClass(emojiSection, `wdt-emoji-section`);

		for(const i in emojiList){ // eslint-disable-line guard-for-in
			const em = emojiList[i];

			if(!em.has_img_twitter) continue;

			const emojiLink = document.createElement(`a`);

			addClass(emojiLink, `wdt-emoji`);
			addClass(emojiLink, wdtEmojiBundle.getRandomPickerColor());

			emojiLink.dataset.hasImgApple = em.has_img_apple;
			emojiLink.dataset.hasImgEmojione = em.has_img_emojione;
			emojiLink.dataset.hasImgGoogle = em.has_img_google;
			emojiLink.dataset.hasImgTwitter = em.has_img_twitter;
			emojiLink.dataset.hasImgFacebook = em.has_img_facebook;
			emojiLink.dataset.hasImgMessenger = em.has_img_messenger;
			emojiLink.dataset.wdtEmojiName = em.name;
			emojiLink.dataset.wdtEmojiShortnames = `:` + em.short_names.join(`: :`) + `:`;
			emojiLink.dataset.wdtEmojiShortname = em.short_name;
			emojiLink.dataset.wdtEmojiOrder = em.sort_order;

			emojiLink.innerHTML = self.emoji.replace_colons(`:` + em.short_name + `:`);

			emojiListDiv.appendChild(emojiLink);
		}

		emojiSection.appendChild(emojiTitle);
		emojiSection.appendChild(emojiListDiv);
		wdtEmojiBundle.sectionsContainer.appendChild(emojiSection);
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
	delete this.openedPicker;
	this.popup.removeClass(`open`);
	window.removeEventListener(`resize`, repositionPopup);

	return this;
};

wdtEmojiBundle.bindEvents = function(){
	const self = this;
	const stickers = document.querySelectorAll(`.wdt-emoji-section h3`);
	if(stickers.length){
		for(let i = 0; i < stickers.length; i++){
			sticky(stickers[i]);
		}
	}

	live(`click`, `.wdt-emoji-list a.wdt-emoji`, function(){
		const selection = getSelection(wdtEmojiBundle.input);

		replaceText(wdtEmojiBundle.input, selection, `:` + this.dataset.wdtEmojiShortname + `:`);

		const ce = document.createEvent(`Event`);
		ce.initEvent(`input`, true, true);
		wdtEmojiBundle.input.dispatchEvent(ce);
		wdtEmojiBundle.close();

		return false;
	});

	live(`click`, `.wdt-emoji-popup-mobile-closer`, () => wdtEmojiBundle.close());

	function liveExact(eventType, className, tagName, callback){
		wdtEmojiBundle.sectionsContainer.addEventListener(eventType, function(event){
			const target = event.target;
			if(target.tagName === tagName && target.className.indexOf(className) === 0) callback.call(target, event);
		});
	}

	liveExact(`mouseover`, `wdt-emoji`, `A`, function(){
		if(wdtEmojiBundle.previewTimer)
			clearTimeout(wdtEmojiBundle.previewTimer);

		if(wdtEmojiBundle.previewExitTimer)
			clearTimeout(wdtEmojiBundle.previewExitTimer);

		const emo = this;

		wdtEmojiBundle.previewTimer = setTimeout(function(){
			wdtEmojiBundle.popup.addClass(`preview-mode`);

			const shortName = `:${emo.dataset.wdtEmojiShortname}:`;
			if(shortName === wdtEmojiBundle.previewAliases.innerHTML) return;
			wdtEmojiBundle.previewImg.innerHTML = self.emoji.replace_colons(shortName);
			wdtEmojiBundle.previewName.innerHTML = emo.dataset.wdtEmojiShortname;
			wdtEmojiBundle.previewAliases.innerHTML = shortName;
		}, 100);

		return false;
	});

	liveExact(`mouseout`, `wdt-emoji`, `A`, function(){
		if(wdtEmojiBundle.previewExitTimer) clearTimeout(wdtEmojiBundle.previewExitTimer);

		wdtEmojiBundle.previewExitTimer = setTimeout(function(){
			wdtEmojiBundle.popup.removeClass(`preview-mode`);
		}, 1000);
	});

	live(`click`, `.wdt-emoji-tab`, function(){
		const group = this.dataset.groupName;
		const groupHeader = wdtEmojiBundle.popup[0].querySelector(`.wdt-emoji-section h3[data-emoji-group="` + group + `"]`);

		if(groupHeader){
			wdtEmojiBundle.setActiveTab(group);
			wdtEmojiBundle.scroller.scrollTop = groupHeader.offsetTop - groupHeader.getBoundingClientRect().height - 2;
		}
	});

	live(`input`, `#wdt-emoji-search`, function(){
		const input = this;
		if(wdtEmojiBundle.searchTimer){
			clearTimeout(wdtEmojiBundle.searchTimer);
		}

		wdtEmojiBundle.searchTimer = setTimeout(function(){
			wdtEmojiBundle.search(input.value);
		}, 225);
	});

	addListenerMulti(wdtEmojiBundle.scroller, `mousewheel DOMMouseScroll`, function(e){
		const delta = e.wheelDelta || (e.originalEvent && e.originalEvent.wheelDelta) || -e.detail;
		const bottomOverflow = this.scrollTop + this.getBoundingClientRect().height - this.scrollHeight >= 0;
		const topOverflow = this.scrollTop <= 0;
		if((delta < 0 && bottomOverflow) || (delta > 0 && topOverflow)){
			e.preventDefault();
		}
	});
};

wdtEmojiBundle.search = function(q){
	const searchResultH3 = wdtEmojiBundle.popup[0].querySelector(`#wdt-emoji-search-result-title`);
	const emojiList = this.sectionsContainer.querySelectorAll(`.wdt-emoji`);
	const zeroText = wdtEmojiBundle.popup[0].querySelector(`#wdt-emoji-no-result`);
	let found = 0;

	if(q === ``){
		removeClass(searchResultH3, `wdt-show`);
		removeClass(zeroText, `wdt-show`);
		removeClassAll(`.wdt-emoji.not-matched`, `not-matched`);
		removeClassAll(`.wdt-emoji-section`, `wdt-inline`);
		removeClassAll(`.wdt-emoji-list`, `wdt-inline`);
		removeClassAll(`.wdt-emoji-section h3`, `wdt-search-on`);
		return this;
	}

	for(let i = 0; i < emojiList.length; i++){
		const emo = emojiList[i];
		const sst = emo.dataset.wdtEmojiName + ` ` + emo.dataset.wdtEmojiShortnames;

		removeClass(emo, `not-matched`);
		if(sst.match(new RegExp(q, `gi`))){
			found++;
		}else{
			addClass(emo, `not-matched`);
		}
	}

	addClass(searchResultH3, `wdt-show`);
	addClassAll(`.wdt-emoji-section`, `wdt-inline`);
	addClassAll(`.wdt-emoji-list`, `wdt-inline`);
	addClassAll(`.wdt-emoji-section h3`, `wdt-search-on`);

	if(found){
		removeClass(zeroText, `wdt-show`);
	}else{
		addClass(zeroText, `wdt-show`);
	}

	return this;
};

wdtEmojiBundle.render = function(text){
	return this.emoji.replace_colons(this.emoji.replace_emoticons(this.emoji.replace_unified(text)));
};

const addListenerMulti = function(el, events, cb){
	events = events.split(` `);
	for(const i = 0; i < events.length; i++){
		el.addEventListener(events[i], cb, false);
	}
};

const sticky = function(el){
	const scrollerRect = wdtEmojiBundle.scroller.getBoundingClientRect();
	const elTop = el.getBoundingClientRect().top - scrollerRect.top;
	const tabHeaderHeight = wdtEmojiBundle.popup[0].querySelector(`#wdt-emoji-menu-header`).getBoundingClientRect().height;

	wdtEmojiBundle.scroller.addEventListener(`scroll`, check);

	function check(){
		const scrollTop = wdtEmojiBundle.scroller.scrollTop;

		if(hasClass(el, `sticky`) && scrollTop < elTop){
			removeClass(el, `sticky`);
			css(el, {top: null});
			css(el.parentNode, {'padding-top': null});
		}else if(scrollTop > elTop && !hasClass(el, `sticky`)){
			const stickers = document.querySelectorAll(`.wdt-emoji-section h3`);
			if(stickers.length){
				for(let i = 0; i < stickers.length; i++){
					removeClass(stickers[i], `sticky`);
					css(stickers[i], {top: null});
					css(stickers[i].parentNode, {'padding-top': null});
				}
			}

			addClass(el, `sticky`);
			css(el, {'top': tabHeaderHeight + `px`});
			css(el.parentNode, {'padding-top': el.getBoundingClientRect().height + `px`});

			wdtEmojiBundle.setActiveTab(el.dataset.emojiGroup);
		}
	}
};

wdtEmojiBundle.setActiveTab = function(group){
	const tabs = document.querySelectorAll(`.wdt-emoji-tab`);
	if(tabs.length){
		for(let t = 0; t < tabs.length; t++){
			removeClass(tabs[t], `active`);
		}
	}

	const activeTab = wdtEmojiBundle.popup[0].querySelector(`.wdt-emoji-tab[data-group-name="` + group + `"]`);
	addClass(activeTab, `active`);
};

const getSelection = function(el){
	let result = {};

	if(el.getAttribute(`contenteditable`)){
		return {
			el: el,
			ce: true
		};
	}

	if(window.getSelection){
		const val = el.value || el.innerHTML;
		const len = val.length;
		const start = el.selectionStart;
		const end = el.selectionEnd;
		const sel = val.substring(start, end);

		result = {
			el,
			start,
			end,
			len,
			sel
		};
	}else if(document.selection){ // ie
		const range = document.selection.createRange();
		const value = el.value || el.innerHTML;
		const storedRange = range.duplicate();

		storedRange.moveToElementText(el);
		storedRange.setEndPoint(`EndToEnd`, range);
		el.selectionStart = storedRange.text.length - range.text.length;
		el.selectionEnd = el.selectionStart + range.text.length;

		result = {
			el,
			start: el.selectionStart,
			end: el.selectionEnd,
			len: value.length,
			sel: range.text
		};
	}

	return result;
};

const replaceText = function(el, selection, emo){
	const val = el.value || el.innerHTML || ``;
	emo = emo + ` `; // append a space

	if(selection.ce){ // if contenteditable
		el.focus();
		document.execCommand(`insertText`, false, emo);
	}else{
		let textBefore = val.substring(0, selection.start);
		textBefore = textBefore.replace(/:\S*$/, ``);
		el.value = textBefore + emo + val.substring(selection.end, selection.len);

		// @todo - [needim] - check browser compatibilities
		el.selectionStart = el.selectionEnd = (textBefore.length + emo.length);
		el.focus();
	}
};

const live = function(eventType, elementQuerySelector, cb){
	document.addEventListener(eventType, function(event){
		const qs = document.querySelectorAll(elementQuerySelector);

		let el = event.target;
		let index = -1;
		while(el && ((index = Array.prototype.indexOf.call(qs, el)) === -1)){
			el = el.parentElement;
		}

		if(index > -1){
			cb.call(el, event);
		}
	});
};

const css = (function(){
	const cssPrefixes = [`Webkit`, `O`, `Moz`, `ms`];
	const cssProps = {};

	function camelCase(string){
		return string.replace(/^-ms-/, `ms-`).replace(/-([\da-z])/gi, function(match, letter){
			return letter.toUpperCase();
		});
	}

	function getVendorProp(name){
		const style = document.body.style;
		if(name in style) return name;

		let i = cssPrefixes.length;
		const capName = name.charAt(0).toUpperCase() + name.slice(1);
		let vendorName;
		while(i--){
			vendorName = cssPrefixes[i] + capName;
			if(vendorName in style) return vendorName;
		}

		return name;
	}

	function getStyleProp(name){
		name = camelCase(name);
		return cssProps[name] || (cssProps[name] = getVendorProp(name));
	}

	function applyCss(element, prop, value){
		prop = getStyleProp(prop);
		element.style[prop] = value;
	}

	return function(element, properties){
		const args = arguments; // eslint-disable-line prefer-rest-params
		let prop;

		if(args.length === 2){
			for(prop in properties){
				if(typeof properties[prop] !== `undefined` && properties.hasOwnProperty(prop))
					applyCss(element, prop, properties[prop]);
			}
		}else{
			applyCss(element, args[1], args[2]);
		}
	};
}());

function hasClass(element, name){
	const list = typeof element === `string` ? element : classList(element);
	return list.indexOf(` ` + name + ` `) >= 0;
}

function addClass(element, name){
	const oldList = classList(element);
	const newList = oldList + name;

	if(hasClass(oldList, name)) return;

	// Trim the opening space.
	element.className = newList.substring(1);
}

function addClassAll(query, name){
	const elements = document.querySelectorAll(query);

	for(let i = 0; i < elements.length; i++){
		const element = elements[i];

		const oldList = classList(element);
		const newList = oldList + name;

		if(hasClass(oldList, name)) return;

		element.className = newList.substring(1);
	}
}

function removeClass(element, name){
	const oldList = classList(element);

	if(!hasClass(element, name)) return;

	// Replace the class name.
	const newList = oldList.replace(` ` + name + ` `, ` `);

	// Trim the opening and closing spaces.
	element.className = newList.substring(1, newList.length - 1);
}

function removeClassAll(query, name){
	const elements = document.querySelectorAll(query);

	for(let i = 0; i < elements.length; i++){
		const element = elements[i];

		const oldList = classList(element);

		if(!hasClass(element, name)) return;

		// Replace the class name.
		const newList = oldList.replace(` ` + name + ` `, ` `);

		// Trim the opening and closing spaces.
		element.className = newList.substring(1, newList.length - 1);
	}
}

function classList(element){
	return (` ` + (element && element.className || ``) + ` `).replace(/\s+/gi, ` `);
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
		let field;
		let picker;

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