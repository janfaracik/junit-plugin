export interface ResultsBundle {
    results: Result[];
}

export interface Result {
    age: number;
    duration: string; // not right
    errorDetails: string;
    errorStackTrace: string;
    hasStdLog: boolean;
    id: string;
    name: string;
    state: 'UNKNOWN',
    status: 'PASSED'
}
