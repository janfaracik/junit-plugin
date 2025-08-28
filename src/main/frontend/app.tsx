import { LayoutPreferencesProvider } from "./providers/user-preference-provider";
import {useEffect, useState} from "react";
import {getResultsBundle} from "./api/api.ts";
import {ResultsBundle} from "./models/models.ts";
import Test from "./components/test.tsx";

export default function App() {
    const [results, setResults] = useState<ResultsBundle>();

    useEffect(() => {
        getResultsBundle().then(data => setResults(data));
    }, []);

  return (
    <LayoutPreferencesProvider>
      <div>
          {results?.results.map((result) => (
              <Test />
          ))}
      </div>
    </LayoutPreferencesProvider>
  );
}
