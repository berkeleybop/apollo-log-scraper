var AWS = require('aws-sdk');
var us = require('underscore');
var dns = require('dns');

///
/// Helpers.
///

// Aliases.
var each = us.each;

function _ll(arg1) {
    console.log(arg1);
}

// Two or one  args.
function _die(m1, m2) {
    if (typeof(m2) !== 'undefined') {
        console.error('ERROR:', m1, m2);
    } else {
        console.error('ERROR:', m1);
    }
    process.exit(-1);
}

var positive_re = /REST\.GET\.OBJECT ping\.json/;
var negative_re = /aws\-internal/;
function _of_interest_p(str) {
    var ret = false;

    //_ll('TEST: ' + test);
    if (positive_re.test(str) && !negative_re.test(str)) {
        ret = true;
    }

    return ret;
}

///
/// Opts.
///

var argv = require('minimist')(process.argv.slice(2));

// AWS credentials from CLI.
var credential_file = argv['f'] || argv['file'];
if (!credential_file) {
    _die('Option (f|file) is required.');
} else {
    //_ll('Will use credentials: ' + credential_file);
}
AWS.config.loadFromPath(credential_file);

// Bucket/prefix to use.
var bucket = null;
var prefix = null;
var bucket_raw = argv['b'] || argv['bucket'];
if (!bucket_raw) {
    _die('Option (b|bucket) is required.');
} else {
    // var parts = bucket_raw.split('/');
    // if( ! parts || parts.length !== 2 ){
    // _die('Not a good bucket descriptor: ' + bucket_raw);
    // }else{
    // bucket = parts[0];
    bucket = bucket_raw;
    // prefix = parts[1];
    // }

    //_ll('Will use bucket: ' + bucket + ', with prefix: ' + prefix);
}

///
/// Main.
///

var ipv4_re = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])(?:\\.(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])){3}';
var date_re = /\[(.*)\]/;
var options_re = /\?(.*)\ HTTP/;

// Get the bucket listings.
var s3 = new AWS.S3({params: {Bucket: bucket, Prefix: prefix}});
s3.listObjects(function (err, data) {
    if (err) {
        _die(err, err.stack);
    } else {

        // Extract the keys from the listing.
        if (data.Contents) {
            each(data.Contents, function (obj) {
                var key = obj.Key;

                // Get the objects.
                s3.getObject({Key: key}, function (err, data) {
                    if (err) {
                        _die(err, err.stack);
                    } else {

                        // Break the body into separate lines
                        var body = data.Body.toString('utf8');
                        var lines = body.split("\n");
                        us.each(lines, function (line) {

                            // Filter out anything we don't need.
                            if (_of_interest_p(line)) {
                                // console.log(line);
                                // "GET /apollo-usage-2.0.5-snapshot/ping.json?server=ApolloSever-17846407921100166222&environment=test HTTP/1.1"

                                // 4e71fbafdde83a0bf32b0b4905cc1d61b49831eeac7e44ba2df92a80196d6ee1 apollo-usage-2.0.5-snapshot [18/Nov/2016:00:39:53 +0000] 130.211.219.203 - BF5D1356AC643431 REST.GET.OBJECT ping.j
                                // son "GET /apollo-usage-2.0.5-snapshot/ping.json?server=ApolloSever-17846407921100166222&environment=test HTTP/1.1" 200 - 3 3 17 16 "-" "Java/1.8.0_111" -

                                // Pull out IP addresses.
                                var ip_matches = line.match(ipv4_re);
                                var date_matches = line.match(date_re);
                                var option_matches = line.match(options_re);
                                //console.log(ip_matches);
                                //console.log(date_matches);
                                var ip = ip_matches[0];
                                var date = date_matches[1];
                                var option = option_matches ? option_matches[0] : "None";
                                if(option.endsWith(" HTTP")){
                                    option = option.substr(0,option.length - 5);
                                }
                                if(option.startsWith("?")){
                                    option = option.substr(1);
                                }

                                console.log([ip, date, option].join("\t"));
                            }
                        });
                    }
                });
            });
        }
    }
});
