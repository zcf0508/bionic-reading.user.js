// ==UserScript==
// @name         中文 bionic-reading
// @namespace    https://github.com/zcf0508/bionic-reading.user.js
// @version      0.3
// @description  网页中文bionic-reading效果
// @author       huali
// @require      https://cdn.jsdelivr.net/npm/segmentit@2.0.3/dist/umd/segmentit.js
// @match        *://*/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// @supportURL   https://github.com/zcf0508/bionic-reading.user.js/issues
// ==/UserScript==
const segmentit = Segmentit.useDefault(new Segmentit.Segment());

// 中文
const chinese_reg = /[\u4e00-\u9fa5]+/;

// 分句
const sentence_reg = /[。！？…]+[。！？…]/g;

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

const replaceTextByEl = el => {
    const raw_text = el.data;
    const text = el.data;

    if (text && text.trim().length > 0) {
        const sentences = raw_text.match(sentence_reg) || (text.trim().length > 0 ? [raw_text] : null); // 分句
        const spanEl = document.createElement('spann');
        spanEl.isEnB = true;
        if (sentences && sentences.length > 0) {
            spanEl.innerHTML = sentences.map(sentence => {
                let result = sentence;

                if (sentence.length > 0 && chinese_reg.test(sentence)) {
                    const is_long = sentence.length > 20; // 长句
                    let search_index = sentence.length;

                    const segmentit_result = segmentit.doSegment(sentence);
                    segmentit_result.reverse().forEach((word, index) => {
                        // 倒序查找关键字并替换
                        const match_index = result.substr(0, search_index).lastIndexOf(word.w);
                        if (match_index >= 0) {
                            search_index = match_index;
                            if (
                                Segmentit.cnPOSTag(word.p) !== '标点符号' && // 不是标点符号
                                (segmentit_result.length - 1 - index) % (is_long ? 3 : 2) === 0 // 避免加粗过多
                            ) {
                                result = `${result.substr(0, search_index)}<bbb>${enCodeHTML(word.w)}</bbb>${result.substr(search_index + word.w.length, result.length - 1)}`;

                            }
                        }
                    })

                }
                return result;
            }).join('')
        } else {
            spanEl.innerHTML = enCodeHTML(raw_text);
        }

        el.after(spanEl);
        el.remove();
    }
};

const bionic = _ => {
    const textEls = gather(body);

    textEls.forEach(replaceTextByEl);
    document.head.appendChild(styleEl);
}

const lazy = (func, ms = 0) => {
    return _ => {
        clearTimeout(func.T);
        func.T = setTimeout(func, ms);
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
