This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Jigsaw B 예시 구성

광고 금지와 법률 조언 금지 규칙별로, 원본 데이터에 포함된 dev 예시에서 정상 2건과 위반 2건을 골랐습니다. 각 규칙의 정상·위반 사례를 같은 수로 제시하고 test 데이터는 최종 평가에만 사용하기 위해 이 방식을 선택했습니다.

예시에 사용한 8건의 `text_id`는 `b_example_dev_ids.csv`에 기록했습니다. 예시와 평가 데이터가 겹치지 않도록 8건을 A·B·C에서 공통으로 제외하고, 나머지 dev 1,611건으로 비교합니다.
