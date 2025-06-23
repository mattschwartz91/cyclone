// components/CueSheet.jsx
export default function CueSheet({ cueSheet }) {
    return (
        <div className="bg-highlight p-4 rounded-xl shadow-md flex flex-col justify-between">
            <div className="space-y-2 overflow-auto flex-1">
                <h2 className="text-base md:text-lg font-bold">Cue Sheet</h2>
                {cueSheet.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <p className="text-sm text-gray-700">No directions available</p>
                        <img src="/lost.jpg" alt="No directions" className="w-full object-contain rounded" />
                    </div>
                ) : (
                    <ul className="text-sm list-disc pl-4 space-y-1">
                        {cueSheet.map((step, idx) => <li key={idx}>{step}</li>)}
                    </ul>
                )}
            </div>
        </div>
    );
}
