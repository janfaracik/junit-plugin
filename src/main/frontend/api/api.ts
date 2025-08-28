import {ResultsBundle} from "../models/models.ts";

export async function getResultsBundle(): Promise<ResultsBundle> {
    return Promise.resolve({
        results: [
            {
                age: 1,
                duration: '1',
                errorDetails: 'idk',
                errorStackTrace: 'idk',
                hasStdLog: true,
                id: 'idk',
                name: 'idk',
                state: 'UNKNOWN',
                status: 'PASSED'
            }
        ]
    } as ResultsBundle);
}
