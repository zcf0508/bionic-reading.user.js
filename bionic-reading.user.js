// ==UserScript==
// @name         中文 bionic-reading
// @namespace    https://github.com/zcf0508/bionic-reading.user.js
// @version      0.2
// @description  网页中文bionic-reading效果
// @author       huali
// @require      https://cdn.jsdelivr.net/npm/segmentit@2.0.3/dist/umd/segmentit.js
// @match        *://*/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @supportURL   https://github.com/itorr/bionic-reading.user.js/issues
// ==/UserScript==
const segmentit = Segmentit.useDefault(new Segmentit.Segment());

// 中文
const chinese_reg = /[\u4e00-\u9fa5]/i;

// 分句
const sentence_reg = /[^：。！？]+[：。！？]/g;

const enCodeHTML = s => s.replace(/[\u00A0-\u9999<>\&]/g, w => '&#' + w.charCodeAt(0) + ';');

let body = document.body;

if (/weibo/.test(location.hostname)) {
    const wbMainEl = document.querySelector('.WB_main');
    if (wbMainEl) body = wbMainEl;

    // 修复旧版微博自定义样式失效 bug
    const customStyleEl = document.querySelector('#custom_style');
    if (customStyleEl) customStyleEl.removeAttribute('id');
}

const styleEl = document.createElement('style');
styleEl.innerHTML = 'bbb{font-weight:bolder;}';

const excludeTagNames = [
    'script', 'style', 'xmp',
    'input', 'textarea',
    'pre', 'code',
    'h1', 'h2', 'h3', 'h4',
    'b', 'strong'
].map(a => a.toUpperCase());

const gather = el => {
    let textEls = [];
    el.childNodes.forEach(el => {
        if (el.isEnB) return;

        if (el.nodeType === 3) {
            textEls.push(el);
        } else if (el.childNodes) {
            if (excludeTagNames.includes(el.tagName)) return;
            textEls = textEls.concat(gather(el))
        }
    })
    return textEls;
};

const engRegexi = /[a-z][a-z0-9]+/i;
const engRegexig = /[a-z][a-z0-9]+/ig;

let replaceTextByEl = el => {
    const text = el.data;
    const sentences = text.match(sentence_reg); // 分句

    const spanEl = document.createElement('spann');
    spanEl.isEnB = true;
    if (sentences && sentences.length > 0) {
        spanEl.innerHTML = sentences.map(sentence => {
            const is_long = sentence.length > 20; // 长句
            return segmentit.doSegment(sentence).map((word, index) => {
                if (
                    Segmentit.cnPOSTag(word.p) !== '标点符号' && // 不是标点符号
                    chinese_reg.test(word.w) && // 中文
                    index % (is_long ? 3 : 2) === 0 // 避免加粗过多
                ) {
                    return '<bbb>' + enCodeHTML(word.w) + '</bbb>';
                } else {
                    return enCodeHTML(word.w);
                }
            }).join('')
        }).join('')
    } else {
        spanEl.innerHTML = text;
    }

    el.after(spanEl);
    el.remove();
};

const bionic = _ => {
    const textEls = gather(body);

    textEls.forEach(replaceTextByEl);
    document.head.appendChild(styleEl);
}

const lazy = (func, ms = 0) => {
    return _ => {
        clearTimeout(func.T)
        func.T = setTimeout(func, ms)
    }
};
lazy(bionic)();

if (window.ResizeObserver) {
    (new ResizeObserver(lazy(bionic, 100))).observe(body);
} else {
    const { open, send } = XMLHttpRequest.prototype;
    XMLHttpRequest.prototype.open = function () {
        this.addEventListener('load', lazy(bionic));
        return open.apply(this, arguments);
    };
    document.addEventListener('click', lazy(bionic));

    window.addEventListener('load', lazy(bionic));
    document.addEventListener("DOMContentLoaded", lazy(bionic));
}
