// ==UserScript==
// @name         中文 bionic-reading
// @namespace    https://github.com/zcf0508/bionic-reading.user.js
// @version      0.4.1
// @description  网页中文bionic-reading效果 Ctrl + B / ⌘ + B 开启关闭
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
const sentence_reg = /[^。！？…]+[。！？…]*/g;

let isBionic = false;

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
styleEl.innerHTML = 'bbb{font-weight:bold;}';

const excludeTagNames = [
    'script', 'style', 'xmp',
    'input', 'textarea', 'select',
    'pre', 'code',
    'h1', 'h2', 'h3', 'h4',
    'b', 'strong', 'i'
].map(a => a.toUpperCase());

const gather = el => {
    let textEls = [];
    el.childNodes.forEach(el => {
        if (el.isEnB) return;
        if (el.originEl) return;

        if (el.nodeType === 3) {
            textEls.push(el);
        } else if (el.childNodes) {
            if (excludeTagNames.includes(el.tagName)) return;
            textEls = textEls.concat(gather(el));
        }
    })
    return textEls;
};

const replaceTextByEl = el => {
    const raw_text = el.data;
    const text = el.data;

    if (text && text.trim().length > 0) {
        const sentences = raw_text.match(sentence_reg) || (text.trim().length > 0 ? [raw_text] : null); // 分句
        if (!el.replaceEL) {
            const spanEl = document.createElement('bionic');
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
            spanEl.originEl = el;
            el.replaceEL = spanEl;
        }
        el.after(el.replaceEL);
        el.remove();
    }
};

const bionic = _ => {
    const textEls = gather(body);

    isBionic = true;

    textEls.forEach(replaceTextByEl);
    document.head.appendChild(styleEl);
}

const lazy = (func, ms = 15) => {
    return _ => {
        clearTimeout(func.T);
        func.T = setTimeout(func, ms);
    }
};

bionic();

const listenerFunc = lazy(_ => {
    if (!isBionic) return;

    bionic();
});

const { open, send } = XMLHttpRequest.prototype;
XMLHttpRequest.prototype.open = function () {
    this.addEventListener('load', listenerFunc);
    return open.apply(this, arguments);
};

if (window.MutationObserver) {
    (new MutationObserver(listenerFunc)).observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
    });
} else {

    window.addEventListener('load', listenerFunc);
    document.addEventListener('DOMContentLoaded', listenerFunc);
    document.addEventListener('DOMNodeInserted', listenerFunc);
}


// document.addEventListener('click',listenerFunc);


const revoke = _ => {
    const els = [...document.querySelectorAll('bionic')];

    els.forEach(el => {
        const { originEl } = el;
        if (!originEl) return;

        el.after(originEl);
        el.remove();
    })

    isBionic = false;
};
// document.addEventListener('mousedown',revoke);

const redo = _ => {
    const textEls = gather(body);

    textEls.forEach(el => {
        const { replaceEl } = el;

        if (!replaceEl) return;


        el.after(replaceEl);
        el.remove();
    })

    isBionic = false;
};

document.addEventListener('keydown', e => {
    const { ctrlKey, metaKey, key } = e;

    if (ctrlKey || metaKey) {
        if (key === 'b') {
            if (isBionic) {
                revoke();
            } else {
                bionic();
            }
        }
    }
})

// document.addEventListener('mouseup',redo);
