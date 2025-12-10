// app/components/Footer.tsx
'use client';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 text-gray-700 text-sm py-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4">
        <p>© {new Date().getFullYear()} Career-9. All rights reserved.</p>

        <div className="flex space-x-6 mt-3 sm:mt-0">
          <a
            href="mailto:support@career-9.com"
            className="hover:text-blue-600 transition"
          >
            Contact
          </a>
          <a
            href="https://career-9.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition"
          >
            Website
          </a>
          <a
            href="https://career-9.com/terms-conditions/"
            className="hover:text-blue-600 transition"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
