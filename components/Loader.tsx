
import React from 'react';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = 'Processing...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-800/50 rounded-lg">
      <div className="w-12 h-12 border-4 border-t-indigo-500 border-slate-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-300 font-medium">{message}</p>
    </div>
  );
};

export default Loader;
