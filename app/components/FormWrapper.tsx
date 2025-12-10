import React from 'react';

const FormWrapper = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <div className="w-full bg-white p-8 rounded-xl shadow-lg">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
    {children}
  </div>
);


export default FormWrapper;
