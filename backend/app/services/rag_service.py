def split_text_into_chunks(text: str, chunk_size: int = 900):

    if not text:
        return []

    words = text.split()
    chunks = []

    current_chunk = []

    for word in words:
        current_chunk.append(word)

        if len(current_chunk) >= chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def find_relevant_chunks(
    question: str,
    chunks: list,
    limit: int = 3
):

    question_words = question.lower().split()

    scored_chunks = []

    for chunk in chunks:

        content = chunk.lower()
        score = 0

        for word in question_words:

            if word in content:
                score += 1

        scored_chunks.append(
            (score, chunk)
        )

    scored_chunks.sort(
        key=lambda x: x[0],
        reverse=True
    )

    best_chunks = [
        chunk for score, chunk in scored_chunks[:limit]
        if score > 0
    ]

    return best_chunks