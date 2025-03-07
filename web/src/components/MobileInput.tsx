// src/components/ChatInput.tsx
import React, { useState, useRef, useEffect } from 'react';

const ChatInput: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // 自动调整文本区域高度
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = 'auto';
      textArea.style.height = `${textArea.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setInputValue(value);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 p-2 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <textarea
        ref={textAreaRef}
        className="w-full p-2 overflow-y-auto border rounded-lg resize-none focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="输入消息..."
        style={{ maxHeight: '360px' }} // 设置最大高度为10行（假设每行36px）
      />
      <div className="flex justify-between mt-2">
        <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
          <i className="icon-tag" />
          <span className="ml-1">标签</span>
        </button>
        <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
          <i className="icon-image" />
          <span className="ml-1">图片</span>
        </button>
        {/* 可以添加更多工具栏按钮 */}
      </div>
    </div>
  );
};

export default ChatInput;