import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create an S3 bucket for the static website
const bucket = new aws.s3.Bucket("my-static-site-bucket", {
    website: {
        indexDocument: "index.html",
    },
});

// Configure the S3 bucket's public access settings to allow public bucket policies
const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock("bucketPublicAccessBlock", {
    bucket: bucket.bucket,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

// Upload a sample index.html file to the S3 bucket
const indexObject = new aws.s3.BucketObject("index.html", {
    bucket: bucket.bucket,
    content: `<html><body><h1>Hello, Pulumi!</h1><p>This is a static website deployed with Pulumi.</p></body></html>`,
    contentType: "text/html",
});

// Attach a bucket policy to make the S3 bucket publicly readable
const bucketPolicy = new aws.s3.BucketPolicy("bucketPolicy", {
    bucket: bucket.bucket,
    policy: bucket.arn.apply(arn => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: `${arn}/*`,
            },
        ],
    })),
});

// Create a CloudFront distribution to serve the S3 bucket content
const distribution = new aws.cloudfront.Distribution("my-distribution", {
    enabled: true,
    origins: [
        {
            domainName: bucket.bucketRegionalDomainName,
            originId: bucket.arn,
        },
    ],
    defaultRootObject: "index.html",
    defaultCacheBehavior: {
        targetOriginId: bucket.arn,
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD", "OPTIONS"],
        forwardedValues: {
            queryString: false,
            cookies: { forward: "none" },
        },
        minTtl: 0,
        defaultTtl: 86400,
        maxTtl: 31536000,
    },
    priceClass: "PriceClass_100",
    viewerCertificate: {
        cloudfrontDefaultCertificate: true,
    },
    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },
});

// Export the S3 bucket name and CloudFront distribution URL
export const bucketName = bucket.bucket;
export const websiteUrl = distribution.domainName;