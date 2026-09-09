export const metadata = {
  title: "Brain Dump",
  description: "Daily task generator and day summarizer wired to Notion",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#F6F3EC",
          color: "#26241F",
          fontFamily:
            "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
