import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const downloadAsPDF = async (elementId: string, filename: string) => {
    await downloadAsMHTML(elementId, filename);
};

export const downloadAsMHTML = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        // Collect all styles from the current document to ensure identical rendering
        let styleSheetsStr = '';
        for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            try {
                if (sheet.cssRules) {
                    for (let j = 0; j < sheet.cssRules.length; j++) {
                        styleSheetsStr += sheet.cssRules[j].cssText + '\n';
                    }
                }
            } catch (e) {
                // Ignore CORS issues with external stylesheets
                if (sheet.href) {
                     styleSheetsStr += `@import url("${sheet.href}");\n`;
                }
            }
        }

        // Also grab all inline <style> tags and <link rel="stylesheet">
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

        // Clone the element so we can mutate it without affecting the live DOM
        const clonedElement = element.cloneNode(true) as HTMLElement;

        // Remove elements explicitly marked to be hidden during export
        const elementsToHide = clonedElement.querySelectorAll('[data-export-hide="true"]');
        elementsToHide.forEach(el => el.remove());

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=1200, initial-scale=1">
    <title>${filename}</title>
    ${styles}
    <style>
        /* Fallback injected styles from document.styleSheets */
        ${styleSheetsStr}

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: #f8fafc;
            padding: 40px;
            margin: 0;
            display: flex;
            justify-content: center;
            min-height: 100vh;
        }

        #download-wrapper {
            background: white;
            width: 1200px; /* Force Desktop width */
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            overflow: hidden;
            position: relative;
            padding: 20px;
        }

        /* Ensure specific elements hidden for printing stay hidden, and shown stay shown */
        .hidden { display: none !important; }

        #${elementId} {
            display: block !important;
            opacity: 1 !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
        }

        /* Force text colors to contrast nicely if missing */
        h1, h2, h3, h4, h5, h6 { color: #0f172a; }
        p, span, div { color: inherit; }
    </style>
    <!-- Tailwind CDN as ultimate fallback, but local styles should take precedence -->
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 text-slate-800">
    <div id="download-wrapper">
        <div id="${elementId}">
            ${clonedElement.innerHTML}
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.html`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

    } catch (error) {
        console.error('Error generating HTML download:', error);
        alert('Failed to generate HTML file. Please try again.');
    }
};
