import React, { useState, useEffect } from 'react';
import { useDeepseekAI } from '../hooks/useDeepseekAI';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';


export default function AITranslate() {
  const { loading: aiLoading, error: aiError, call: callAI } = useDeepseekAI();
  const { copied, copy } = useCopyToClipboard();

  const [sourceLanguage, setSourceLanguage] = useState('中文');
  const [targetLanguage, setTargetLanguage] = useState('英文');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  const languages = ['中文', '英文', '西班牙语', '法语', '德语', '日语'];

  const commonPhrases = [
    { zh: '感谢您的询盘', en: 'Thank you for your inquiry' },
    { zh: '请查收附件报价', en: 'Please find the attached quotation' },
    { zh: '期待您的回复', en: 'Looking forward to your reply' },
    { zh: '顺祝商祺', en: 'Wishing you continued success in business' },
    { zh: '我们对贵司产品很感兴趣', en: 'We are very interested in your products' },
    { zh: '请告知最低起订量', en: 'Please advise the minimum order quantity' },
    { zh: '能否提供产品目录', en: 'Could you provide a product catalog' },
    { zh: '我们希望建立长期合作关系', en: 'We hope to establish a long-term partnership' },
    { zh: '请确认交货期', en: 'Please confirm the delivery schedule' },
    { zh: '付款条件是什么', en: 'What are the payment terms' },
  ];

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      alert('请输入需要翻译的文本');
      return;
    }

    try {
      const payload = {
        text: sourceText,
        fromLang: sourceLanguage,
        toLang: targetLanguage,
      };

      const result = await callAI({ task: 'translate', payload });
      setTranslatedText(result.trim());
    } catch (error) {
      console.error('Error translating:', error);
      alert('翻译失败，请重试');
    }
  };

  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    setSourceText(translatedText);
    setTranslatedText('');
  };

  const handleInsertPhrase = (text: string) => {
    setSourceText((prev) => (prev ? prev + '\n' + text : text));
  };

  const handleSourceLanguageChange = (lang: string) => {
    setSourceLanguage(lang);
    setTranslatedText('');
  };

  const handleTargetLanguageChange = (lang: string) => {
    setTargetLanguage(lang);
    setTranslatedText('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="page-header mb-8">
        <h1 className="page-title">AI翻译助手</h1>
        <p className="text-slate-400 mt-2">快速翻译外贸沟通内容</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Source Panel */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-100">源语言</h2>
            <select
              value={sourceLanguage}
              onChange={(e) => handleSourceLanguageChange(e.target.value)}
              className="input-field w-48"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="输入需要翻译的文本..."
            rows={10}
            className="input-field w-full resize-none mb-4"
          />

          <div className="flex justify-between items-center text-sm text-slate-400">
            <span>字符数: {sourceText.length}</span>
            <span className="text-slate-500">
              约 {Math.ceil(sourceText.length / 5)} 个词
            </span>
          </div>
        </div>

        {/* Target Panel */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-100">目标语言</h2>
            <select
              value={targetLanguage}
              onChange={(e) => handleTargetLanguageChange(e.target.value)}
              className="input-field w-48"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {translatedText ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 min-h-[240px] max-h-96 overflow-y-auto text-slate-300 whitespace-pre-wrap leading-relaxed text-sm mb-4">
              {translatedText}
            </div>
          ) : aiLoading ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 min-h-[240px] flex items-center justify-center text-slate-400">
              翻译中...
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 min-h-[240px] flex items-center justify-center text-slate-500">
              翻译结果将显示在这里
            </div>
          )}

          <button
            onClick={() => copy(translatedText)}
            disabled={!translatedText}
            className="btn-secondary w-full"
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      {/* Swap Languages Button */}
      <div className="flex justify-center my-8">
        <button
          onClick={handleSwapLanguages}
          className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 hover:border-slate-600/50 text-slate-300 hover:text-slate-100 px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          <span>交换语言</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* Translate Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={handleTranslate}
          disabled={aiLoading || !sourceText.trim()}
          className="btn-primary px-8 py-3"
        >
          {aiLoading ? '翻译中...' : '翻译'}
        </button>
      </div>

      {aiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm mb-8">
          {aiError}
        </div>
      )}

      {/* Common Phrases Section */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">常用短语</h2>

        <div className="grid grid-cols-2 gap-4">
          {commonPhrases.map((phrase, index) => (
            <button
              key={index}
              onClick={() => handleInsertPhrase(phrase.zh)}
              className="glass-card-hover p-4 text-left rounded-lg transition-all duration-200 border border-slate-700/30 hover:border-slate-600/50"
            >
              <p className="text-slate-200 font-medium text-sm mb-1">{phrase.zh}</p>
              <p className="text-slate-400 text-xs">{phrase.en}</p>
            </button>
          ))}
        </div>

        <p className="text-slate-400 text-sm mt-6 text-center">
          点击短语即可添加到源文本框中
        </p>
      </div>
    </div>
  );
}
