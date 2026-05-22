import fitz
import os


def generate_pdf_thumbnail(
    pdf_path: str,
    output_path: str
):
    os.makedirs(
        os.path.dirname(output_path),
        exist_ok=True
    )

    document = fitz.open(pdf_path)

    page = document[0]

    pix = page.get_pixmap(
        matrix=fitz.Matrix(2, 2)
    )

    pix.save(output_path)

    document.close()

    return output_path