import { Client, isFullPage } from "@notionhq/client"
import { FetchParams } from "./params"
import { formatInTimeZone } from "date-fns-tz"
import { QueryDatabaseParameters, SearchResponse } from "@notionhq/client/build/src/api-endpoints"

/**
 * タイトルの一覧をMarkdownのリスト形式で取得する
 */
export async function fetchTitlesAsMarkdownList(notion: Client, params: FetchParams): Promise<string> {
    const queryParams = newDatabaseQuery(params)
    const response = await notion.databases.query(queryParams)

    const titlesAsMarkdownList = getTitlesAsMarkdownList(response, params.indent)
    return `${titlesAsMarkdownList.join('\n')}\n`
}

/**
 * notion.databases.query用のパラメーターを生成する
 */
export function newDatabaseQuery(params: FetchParams): QueryDatabaseParameters {
    // ISO8601拡張形式に変換
    const startDate = formatInTimeZone(params.date, params.tz, 'yyyy-MM-dd\'T\'00:00:00XXX')
    const endDate = formatInTimeZone(params.toDate, params.tz, 'yyyy-MM-dd\'T\'23:59:59XXX')
    
    return {
        database_id: params.databaseId,
        filter: {
            and: [
                {
                    property: params.datePropertyName,
                    date: {
                        after: startDate,
                    },
                },
                {
                    property: params.datePropertyName,
                    date: {
                        before: endDate,
                    },
                }
            ]
        },
        sorts: [
            {
                property: params.datePropertyName,
                direction: 'ascending',
            }
        ]
    } as QueryDatabaseParameters
}

export function getTitlesAsMarkdownList(response: SearchResponse, indent: boolean): string[] {
    const titlesAsMarkdownList: string[] = []
    for (const page of response.results) {
        if (!isFullPage(page)) {
            continue
        }

        const post = page.properties.post
        if (!post) {
            continue
        }
        if (post.type !== 'title') {
            continue
        }

        for (const richText of post.title) {
            const titleLines = richText.plain_text.split('\n')

            const titleLinesWithListNotationByPage = titleLines.map((title, index) => {
                const line = `- ${title.trim()}`
                if (index === 0) {
                    return line
                }

                // 2行目以降
                if (indent) {
                    return ' '.repeat(4) + line
                }
                return line
            })

            titlesAsMarkdownList.push(...titleLinesWithListNotationByPage)
        }

    }
    return titlesAsMarkdownList
}
