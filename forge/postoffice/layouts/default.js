module.exports = (htmlContent) => {
    return `
    <div lang="en" style="background-color:#eff6ff; height: 100%;" bgcolor="#eff6ff">
    <style>
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
        }
        p {
            line-height: 175%;
            margin-bottom: 10px
        }
    </style>
    <table role="presentation" cellpadding="0" cellspacing="0"
           style="border-spacing:0!important;border-collapse:collapse;margin:0;padding:0;width:100%!important;min-width:320px!important;height:100%!important"
           width="100%" height="100%">
        <tbody>
        <tr>
            <td valign="top"
                style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#33475b;word-break:break-word;padding-top:20px;padding-bottom:20px">
                <div style="color:inherit;font-size:inherit;line-height:inherit">
                    <div style="padding-left:10px;padding-right:10px">
                        <div style="min-width:540px;max-width:1200px;Margin-left:auto;Margin-right:auto;border-collapse:collapse;border-spacing:0;background-color:#ffffff;background-image:url('https://flowfuse.com/images/600x70-HS-newsletter-header.png');background-position:center;background-repeat:no-repeat;background-size:100% 100%"
                             bgcolor="#ffffff">
                            <div>
                                <div style="color:inherit;font-size:inherit;line-height:inherit">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                           style="border-spacing:0!important;border-collapse:collapse">
                                        <tbody>
                                        <tr>
                                            <td align="center" valign="top"
                                                style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;color:#33475b;word-break:break-word;text-align:center;padding:16px 20px;font-size:0px">
                                                <a href="https://flowfuse.com/" style="color:#00a4bd" target="_blank">
                                                    <img src="https://flowfuse.com/handbook/images/logos/ff-logo--wordmark--dark.png"
                                                         style="outline:none;text-decoration:none;border:none;max-width:100%;font-size:16px"
                                                         width="183" align="middle" data-bit="iit">
                                                </a>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="padding-left:10px;padding-right:10px">
                        <div style="min-width:540px;max-width:1200px;Margin-left:auto;Margin-right:auto;border-collapse:collapse;border-spacing:0;background-color:#ffffff"
                             bgcolor="#FFFFFF">
                            <div>
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                                       style="border-spacing:0!important;border-collapse:collapse">
                                    <tbody>
                                    <tr>
                                        <td style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#33475b;word-break:break-word;padding:20px 40px 0">
                                            <div style="color:inherit;font-size:inherit;line-height:inherit">
                                                <div style="color:inherit;font-size:inherit;line-height:inherit">
                                                    ${htmlContent}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div style="padding-left:10px;padding-right:10px">
                        <div style="min-width:540px;max-width:1200px;Margin-left:auto;Margin-right:auto;border-collapse:collapse;border-spacing:0;background-color:#ffffff"
                             bgcolor="#FFFFFF">
                            <div>
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                                       style="border-spacing:0!important;border-collapse:collapse">
                                    <tbody>
                                    <tr>
                                        <td style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#33475b;word-break:break-word;padding:30px 20px 0px">
                                            <div style="color:inherit;font-size:inherit;line-height:inherit">
                                                <table role="none" border="0" cellpadding="0" cellspacing="0"
                                                       style="border-spacing:0!important;border-collapse:collapse;vertical-align:top"
                                                       width="100%">
                                                    <tbody>
                                                    <tr>
                                                        <td align="center"
                                                            style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;color:#33475b;font-size:0;word-break:break-word">
                                                            <p style="font-size:1px;border-top:1px solid #eff6ff;width:90%;margin:0 auto"></p>
                                                        </td>
                                                    </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div style="padding-left:10px;padding-right:10px">
                        <div style="min-width:540px;max-width:1200px;Margin-left:auto;Margin-right:auto;border-collapse:collapse;border-spacing:0;padding-bottom:20px">
                            <div>
                                <div style="color:inherit;font-size:inherit;line-height:inherit">
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                           style="border-spacing:0!important;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;line-height:135%;color:#23496d;margin-bottom:0;padding:0">
                                        <tbody>
                                        <tr>
                                            <td align="center" valign="top"
                                                style="border-collapse:collapse;font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#33475b;word-break:break-word;text-align:center;margin-bottom:0;line-height:135%;padding:10px 20px">
                                                <p style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:normal;text-decoration:none;font-style:normal;color:#33475b">
                                                    FlowFuse Inc, PO Box 7775 #29439, San Francisco, California
                                                </p>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
        </tbody>
    </table>
</div>
`
}
