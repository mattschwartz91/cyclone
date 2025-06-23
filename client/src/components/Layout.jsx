// src/components/Layout.jsx
export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-base text-gray-800">
            <header className="bg-primary text-white p-4 shadow-md">
                <h1 className="text-2xl font-bold">Cyclone</h1>
            </header>

            <main className="p-4">{children}</main>

            <footer className="bg-secondary text-white p-4 mt-8">
                <p>&copy; {new Date().getFullYear()} Cyclone</p>
            </footer>
        </div>
    );
}
