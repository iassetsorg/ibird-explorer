

const input = document.getElementById('transactionIdInput');

/**
 * Event listener for the 'keyup' event on the input element.
 * Calls convertAndFetchData function when the 'Enter' key is pressed.
 *
 * @param {Event} e - The event object.
 */
input.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    convertAndFetchData(); 
  }
})

/**
 * Converts the value from the 'transactionIdInput' field by splitting and reformatting it.
 *
 * @returns {string} The converted transaction ID.
 */
function getConvertedTransactionId() {
    const transactionIdInput = document.getElementById('transactionIdInput').value;
    const [a, b] = transactionIdInput.split("@");
    const c = b.split(".").join("-");
    return `${a}-${c}`;
}

/**
 * Fetches transaction details from Hedera mirror using the converted transaction ID.
 * 
 * @param {string} convertedTransactionId - The converted transaction ID to be used in the URL.
 * @returns {Promise<Object>} The transaction details as a JSON object.
 */
async function fetchTransactionDetails(convertedTransactionId) {
    const url = `https://mainnet-public.mirrornode.hedera.com/api/v1/transactions/${convertedTransactionId.replace(" ", "")}`;
    const response = await fetch(url);
    return await response.json();
}

/**
 * Fetches message data from Hedera mirror using the consensus timestamp,
 * decodes the message from base64 to utf-8.
 *
 * @param {string} consensusTimestamp - The consensus timestamp to be used in the URL.
 * @returns {Promise<string>} The decoded message.
 */
async function fetchMessageData(consensusTimestamp) {
    const url = `https://mainnet-public.mirrornode.hedera.com/api/v1/topics/messages/${consensusTimestamp}`;
    const response = await fetch(url);
    const data = await response.json();
    const base64Message = data.message;
    const decodedMessage = new TextDecoder("utf-8").decode(Uint8Array.from(atob(base64Message), c => c.charCodeAt(0)));
    return decodedMessage;
}

/**
 * Displays transaction, consensus timestamp, and parsed message data in the 'result' div element.
 * Creates and appends media elements based on the media type if media is present in the parsed message.
 *
 * @param {string} convertedTransactionId - The converted transaction ID.
 * @param {string} consensusTimestamp - The consensus timestamp.
 * @param {Object} parsedMessage - The parsed message object.
 * @returns {Promise<void>}
 */
async function displayData(convertedTransactionId, consensusTimestamp, parsedMessage) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<p><strong>Transaction ID:</strong> ${convertedTransactionId}</p>`;
    resultDiv.innerHTML += `<p><strong>Consensus Timestamp:</strong> ${consensusTimestamp}</p>`;
    resultDiv.innerHTML += `<p><strong>pasedMessge:</strong> ${parsedMessage}</p>`;
    if (parsedMessage) {
        resultDiv.innerHTML += `<p><strong>Message Sender:</strong> ${parsedMessage.address}</p>`;
        if(parsedMessage.media) {
            const mediaElement = document.createElement('div');
            const mediaLink = document.createElement('a');
            mediaLink.href = `https://arweave.net/${parsedMessage.media}`;
            mediaLink.textContent = parsedMessage.media;

            const contentType = await getContentType(`https://arweave.net/${parsedMessage.media}`);
            if(contentType.startsWith('image')) {
                const imgElement = document.createElement('img');
                imgElement.src = `https://arweave.net/${parsedMessage.media}`;
                mediaElement.appendChild(imgElement);
            } else if(contentType.startsWith('video')) {
                const videoElement = document.createElement('video');
                videoElement.src = `https://arweave.net/${parsedMessage.media}`;
                videoElement.controls = true;
                mediaElement.appendChild(videoElement);
            } else {
                mediaElement.appendChild(mediaLink);
            }

            resultDiv.appendChild(mediaElement);

        }
        resultDiv.innerHTML += `<p><strong>Media Hash:</strong> ${parsedMessage.media}</p>`;
        const formattedMessage = formatMessage(parsedMessage.message);
        resultDiv.innerHTML += `<p><strong>Message:</strong> <pre>${formattedMessage}</pre></p>`;
    }
}

/**
 * Converts the transaction ID, fetches transaction details and message data,
 * then displays the data on the webpage. Handles errors and displays error messages.
 *
 * @returns {Promise<void>}
 */
async function convertAndFetchData() {
    try {
        const convertedTransactionId = getConvertedTransactionId();
        const firstData = await fetchTransactionDetails(convertedTransactionId);
        const consensusTimestamp = firstData.transactions[0].consensus_timestamp;

        let parsedMessage;
        try {
            const decodedMessage = await fetchMessageData(consensusTimestamp);
            parsedMessage = JSON.parse(decodedMessage);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred while parsing the message as JSON.'
            });
        }

        displayData(convertedTransactionId, consensusTimestamp, parsedMessage);

    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while fetching data. Please check your input and try again.'
        });
    }
}

/**
 * Formats a text message by converting URLs into clickable links,
 * and highlighting words starting with # or $, similar to Twitter.
 * 
 * @param {string} message - The text message to be formatted.
 * @returns {string} The formatted message with clickable links and highlighted words.
 */
function formatMessage(message) {
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const messageWithLinks = message.replace(urlPattern, '<a href="$1" target="_blank">$1</a>');

    const highlightPattern = /([#$][\w]+)/g;
    const formattedMessage = messageWithLinks.replace(highlightPattern, '<span class="highlighted">$1</span>');

    return formattedMessage;
}
  
/**
 * Sends a fetch request to a specified URL and retrieves the 'content-type' from the response headers.
 * 
 * @param {string} url - The URL to send the fetch request to.
 * @returns {Promise<string>} The 'content-type' value from the response headers.
 */
async function getContentType(url) {
    const response = await fetch(url);
    const headers = response.headers;
    return headers.get('content-type');
}

