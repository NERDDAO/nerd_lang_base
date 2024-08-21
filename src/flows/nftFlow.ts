import { Alchemy, Network } from "alchemy-sdk"

const collections = {
	aiUniverse: { address: '0x..', network: 'MAINNET' },
	dataLatte: { address: '0x79e2b756f9c4c12bd8f80c0aeeb7b954e52ff23c', network: 'BASE_MAINNET' }
}


const fecthNFTMetadata = async (name: 'AIU' | 'DLATTE') => {
	let contractAddress: string, config: any
	if (name == 'DLATTE') {
		const config = {
			apiKey: process.env.ALCHEMY_API_KEY, // Replace with your API key
			network: Network.BASE_MAINNET, // Replace with your network
		};

		contractAddress = "0x79e2b756f9c4c12bd8f80c0aeeb7b954e52ff23c";
	}
	else {
		const config = {
			apiKey: process.env.ALCHEMY_API_KEY,
			network: Network.ETH_MAINNET
		}

		contractAddress = "0x79e2b756f9c4c12bd8f80c0aeeb7b954e52ff23c";
	}

	const alchemy = new Alchemy(config);

	const tokenId = "28";

	// call the method
	let response = await alchemy.nft.getNftMetadata(contractAddress, tokenId, {});
}
