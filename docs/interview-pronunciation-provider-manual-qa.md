# Azure pronunciation provider manual QA

1. Do not consent: local audio and speech metrics remain, without an external request.
2. With consent, use a normal 30-second English answer and confirm word/phoneme data only when Azure returns it.
3. Check quiet, clipping, fast delivery, unclear words, Korean, answers under 3 seconds, missing key, timeout, and retry comparison.
4. Confirm no key, raw audio, transcript, or raw provider response is printed to the console or server logs.
