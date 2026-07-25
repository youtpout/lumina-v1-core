
export const poolToka = "B62qjWz1KNji4cf7ok2dur9iLPPrmy1DrpwhXP3iUbzCLjAWi6f2eHy";
//export const poolWeth = "B62qphnhqrRW6DFFR39onHNKnBcoB9Gqi3M8Emytg26nwZWUYXR1itw";

export class Addresses {
    private static list = [];

    private static listZeko = [];

    private static listDevnet = [];

    public static async getList() {
        if (Addresses.list.length) {
            return Addresses.list;
        }
        const listToken = await fetch('/token-list.json');
        const data = await listToken.json();
        Addresses.list = data;
        return Addresses.list;
    }

    public static async getEventList(isZeko) {
        if (isZeko && Addresses.listZeko.length) {
            return Addresses.listZeko;
        }

        if (!isZeko && Addresses.listDevnet.length) {
            return Addresses.listDevnet;
        }

        // Pools come from the Lumina CDN, which indexes the factory events and
        // republishes them several times a day. Reading them from an archive
        // node instead made the list only as available as that node: the public
        // devnet archives are currently unreachable, and a plain node cannot
        // stand in because it does not serve `events` at all.
        const chainId = isZeko ? "zeko:testnet" : "mina:devnet";
        const newList = [];
        try {
            const response = await fetch(`https://cdn.luminadex.com/api/${chainId}/pools`);
            if (!response.ok) {
                throw new Error(`pool list responded ${response.status}`);
            }
            const pools = await response.json();
            for (const pool of pools) {
                // Every pool pairs MINA with one token; that token names the pool.
                const token = pool.tokens?.find((t: any) => t.tokenId !== "MINA");
                if (!token) {
                    continue;
                }
                newList.push({
                    "address": token.address,
                    "poolAddress": pool.address,
                    "chainId": isZeko ? "zeko-devnet" : "mina-devnet",
                    "symbol": token.symbol,
                    "decimals": token.decimals ?? 9,
                    "approved": false,
                    "timestamp": pool.timestamp
                });
            }
        } catch (error) {
            // Surface the reason: an empty list is otherwise indistinguishable
            // from a chain with no pools.
            console.error("failed to load the pool list", error);
        }
        console.log("list", newList);
        if (isZeko) {
            Addresses.listZeko = newList;
            return Addresses.listZeko;
        }

        if (!isZeko) {
            Addresses.listDevnet = newList;
            return Addresses.listDevnet;
        }

    }
}
