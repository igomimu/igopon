export interface FeedbackData {
    difficulty: string;
    fun: string;
    comment: string;
}

// TODO: User needs to provide their own Google Form ID and entry IDs
// For now, we use constants that need to be replaced or configured.
const GOOGLE_FORM_ID = '1FAIpQLSeoLdCMP7RNF0Y_kue37_gEM7tirCgWKkVoAxVL0N9pnO8sDQ'; // Example/Placeholder
const ENTRY_DIFFICULTY = 'entry.2090413209';
const ENTRY_FUN = 'entry.1675820000';
const ENTRY_COMMENT = 'entry.1338349506';

export async function submitFeedback(data: FeedbackData): Promise<void> {
    const formData = new FormData();
    formData.append(ENTRY_DIFFICULTY, data.difficulty);
    formData.append(ENTRY_FUN, data.fun);
    formData.append(ENTRY_COMMENT, data.comment);

    // Using mode: 'no-cors' allows submission to Google Forms without CORS errors,
    // but we won't get a readable response (opaque response).
    await fetch(`https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/formResponse`, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
    });
}
