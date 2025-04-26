//abdasync

const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const settings = { // to avoid ratelimits i guess i dunno i tried :sob:
    rateLimitDelay: 30_000,
    collectionDelay: 200,
    deletionDelay: 700,
    deletionIntervalCount: 5,
    deletionIntervalDelay: 4_000,
}

function questionAsync(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

function tick() {
    return new Date().getTime()
}

function getdelta() {
    const start = tick()
    return {
        started: start,
        delta: function () {
            return tick() - start
        }
    }
}

async function deleteMessages(authToken, authorId, channelId, clear) {
    const start = new Date();


    let messagessearched = 1

    const wait = async (ms) => new Promise(done => setTimeout(done, ms));
    const msToHMS = (s) => `${s / 3.6e6 | 0}h ${(s % 3.6e6) / 6e4 | 0}m ${(s % 6e4) / 1000 | 0}s`;





    console.log(`Started at ${start.toLocaleString()}`);
    console.log(`---- You can abort by pressing control+c on the console ----`);


    const headers = {
        "Authorization": authToken
    };

    const delta = getdelta()
    const messages = await fetch(`https://discordapp.com/api/v9/channels/${channelId}/messages/search?max_id=${new Date().getTime() * (10 ** 6)}`, {
        headers
    })
    let avarageping = delta.delta()

    const decoded = await messages.json()

    let after = (decoded.messages[0][0])
    let lastupdate = tick()

    const totalmessages = decoded.total_results

    const history = []
    const allMessages = [after]
    after = after.id
    console.log("Collecting messages...")
    while (messagessearched < totalmessages - 1) {
        let increacement = 0

        const delta = getdelta()
        const result = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?before=${after}&limit=50`, {
            headers
        })
        avarageping = (avarageping + delta.delta()) / 2

        if (!result.ok) {
            console.log("Rate limit! Waiting 30 seconds!")
            await wait(settings.rateLimitDelay)
        } else {
            const decoded = await result.json()

            decoded.forEach(message => {
                allMessages.push(message)
                history.push(history, `${message.author.username} ${new Date(message.timestamp).toLocaleString()}\n${message.content}\n`)
                messagessearched++
                after = message.id
                increacement ++
            });
     
            const now = tick()
            if ((now - lastupdate) > 5_000) {
                lastupdate = tick()
                console.log(`${messagessearched}/${totalmessages} (${(messagessearched / totalmessages * 100).toFixed(2)}%)`)
            }
            await wait(settings.collectionDelay)
        }
        console.log(increacement)
        if (increacement === 0) {
            break
        }
    }

    if (clear) {
        console.log("Collected messages! Filtering out our messages...")
    const filteredMessages = []
   

    for (let i = 0; i < allMessages.length; i++) {
        const message = allMessages[i]
        if (message.author.id === authorId) {
            filteredMessages.push(message)
        }
    }

    for (let i = 0; i < filteredMessages.length; i++) {
        if (i > 3) {
            const message = filteredMessages[i]
            const resp = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/` + message.id, {
                headers,
                method: "DELETE"
            });
            let delay = settings.deletionDelay
            if (resp.status === 429) {
                console.log(`Rate limited! waiting ${settings.rateLimitDelay} ms!`)
                i--
                delay = settings.rateLimitDelay
            } else if (!resp.ok) {
                console.log("Random error : ", resp.statusText)
            } else {
                console.log(`${((i) / filteredMessages.length * 100).toFixed(2)}% (${i}/${filteredMessages.length}) Deleting`,
                    `[${new Date(message.timestamp).toLocaleString()}] ${message.author.username}#${message.author.discriminator}: ${message.content}`,
                    message.attachments.length ? message.attachments : '');
                if (i%settings.deletionIntervalCount===0){
                    delay = settings.deletionIntervalDelay
                }
            }


    

        await wait(delay)
        }
    }
    }

    return history
}

async function ynQuestion(question) {
    const answer = (await questionAsync(question)).toLowerCase()
    if (answer == "y") {
        return true
    } else if (answer == "n") {
        return false
    } else {
        return await ynQuestion(question)
    }
}
async function Start() {
    console.log("DM archiver by AbdAsync\nFebruary 24th, 2025")
    const authToken = await questionAsync('Enter your authToken: ');
    const channelId = await questionAsync('Enter the target channel: ');
    const accountId = await questionAsync('Enter your account id: ');

    const save = await ynQuestion("Do you wanna save the deleted messages as a text file? (y/n):")
    const clear = await ynQuestion("Do you wanna clear the dms? (y/n):")

    const logs = await deleteMessages(authToken, accountId, channelId, clear)
    if (save) {
        fs.writeFile(`./archives/${channelId}.txt`, logs.reverse().join(" "), (err) => {
            if (err) {
                console.log("Error saving logs! ", err)
            } else {
                console.log(`Archived deleted dms at ./archives/${channelId}.txt`)
            }
        })
    }
    rl.close();
}

Start();
