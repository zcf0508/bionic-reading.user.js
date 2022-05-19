// ==UserScript==
// @name         中文 bionic-reading
// @namespace    https://github.com/zcf0508/bionic-reading.user.js
// @version      0.1
// @description  网页中文bionic-reading效果
// @author       huali
// @require      https://cdn.jsdelivr.net/npm/segmentit@2.0.3/dist/umd/segmentit.js
// @match        *://*/*
// @grant        none
// @license      MIT
// @run-at       document-idle
// ==/UserScript==
const segmentit = Segmentit.useDefault(new Segmentit.Segment());

// 中文
const chinese_reg = /[\u4e00-\u9fa5]/i;

// 分句
const sentence_reg = /[^：。！？]+[：。！？]/g;

const styleEl = document.createElement('style');
styleEl.innerHTML = 'bbb{font-weight:bolder;}';

let textEls = [];
const excludeTagNames = ['script', 'style', 'xmp', 'input', 'textarea', 'pre', 'code'].map(a => a.toUpperCase());
const gather = el => {
    el.childNodes.forEach(el => {
        if (el.isEnB) return;

        if (el.nodeType === 3) {
            textEls.push(el);
        } else if (el.childNodes) {
            if (excludeTagNames.includes(el.tagName)) return;
            gather(el)
        }
    })
};

let body = document.body;


if (/weibo/.test(location.hostname)) {
    const wbMain = document.querySelector('.WB_main');
    if (wbMain) {
        body = wbMain;
    }
}

const customStyleEl = document.querySelector('#custom_style');
if (customStyleEl) customStyleEl.removeAttribute('id');

const enCodeHTML = s=> s.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
    return '&#'+i.charCodeAt(0)+';';
 });

const run = _ => {
    textEls = [];
    gather(body);

    textEls.forEach(textEl => {
        const text = textEl.data;
        if (!chinese_reg.test(text)) return;

        const spanEl = document.createElement('spann');
        spanEl.isEnB = true;
        
        const sentences = text.match(sentence_reg); // 分句

        if (sentences && sentences.length>0){
            spanEl.innerHTML = sentences.map(sentence=>{
                const is_long = sentence.length > 20; // 长句
                return segmentit.doSegment(sentence).map((word, index) => {
                    if (
                        Segmentit.cnPOSTag(word.p) !== '标点符号' && // 不是标点符号
                        chinese_reg.test(word.w) && // 中文
                        index % (is_long ? 3 : 2) === 0 // 避免加粗过多
                    ) {
                        return '<bbb>'+enCodeHTML(word.w)+'</bbb>';
                    } else {
                        return enCodeHTML(word.w);
                    }
                }).join('')
            }).join('')
        }else{
            spanEl.innerHTML = text;
        }

        textEl.after(spanEl);
        textEl.remove();
    });
    document.head.appendChild(styleEl);
}
run();
const _run = ms=> _=>setTimeout(run,ms);

const {open,send} = XMLHttpRequest.prototype;

XMLHttpRequest.prototype.open = function(){
    this.addEventListener('load',_run(500));
    return open.apply(this,arguments);
};

document.addEventListener('click',_run(500));
window.addEventListener('load',_run(500));
document.addEventListener("DOMContentLoaded",_run(500));