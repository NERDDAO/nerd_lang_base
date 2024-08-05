import axios from "axios"
import { AxiosRequestConfig } from "axios"

export default async (url: string, args: AxiosRequestConfig) => {
    try {
        const { data } = await axios(url, {
            headers: {
                ...args.headers,
                'Content-Type': 'application/json'
            }
        })

        return data;
    } catch (error) {
        
        if (error?.response?.data) {
            return error.response.data
        }

        if (error && !error?.response?.data) {
            throw error
        }

        return []
    }
}