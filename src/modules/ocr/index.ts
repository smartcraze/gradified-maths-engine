import axios from "axios";
import { env } from "@/config/env";

export async function processOCR(fileUrl: string) {
	const res = await axios.post(
		"https://www.datalab.to/api/v1/convert",
		{
			file_url: fileUrl,
			output_format: "markdown",
		},
		{
			headers: {
				"X-API-Key": env.DATALAB_API_KEY,
			},
		},
	);

	const checkUrl = res.data.request_check_url;

	while (true) {
		const statusRes = await axios.get(checkUrl, {
			headers: {
				"X-API-Key": env.DATALAB_API_KEY,
			},
		});

		if (statusRes.data.status === "complete") {
			return statusRes.data.markdown;
		}

		await new Promise((r) => setTimeout(r, 2000));
	}
}
