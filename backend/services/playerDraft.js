function drafted(year, round, overall) {
    const values = [year, round, overall].map(Number)
    return values.every(Number.isInteger) && values[0] >= 1947 && values[1] > 0 && values[2] > 0
        ? { status: 'drafted', year: values[0], round: values[1], overall: values[2] } : null
}

function espnDraft(value) {
    return value ? drafted(value.year, value.round, value.selection) : null
}

function nbaDraft({ draftYear, draftRound, draftNumber }) {
    if ([draftYear, draftRound, draftNumber].some(value => /^undrafted$/i.test(String(value).trim()))) return { status: 'undrafted' }
    return drafted(draftYear, draftRound, draftNumber)
}

module.exports = { espnDraft, nbaDraft }
