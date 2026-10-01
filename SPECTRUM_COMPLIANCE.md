# Spectrum Compliance

Spectrum Compliance compares the mix against the reference track in ten
standard octave bands, from 31.5 Hz to 16 kHz. Select the Streaming, Radio, or
TV/Broadcast profile to see the mix-minus-reference level in each band against
the profile's lower and upper tolerances. Bands outside a tolerance are shown
as violations; a custom profile lets you set each limit in 0.5 dB steps from
−12 to +12 dB.

## Using the tab

1. Upload a reference and a mix, then analyze them.
2. Open **Spectrum Compliance** and select a profile.
3. Review the shaded tolerance range, band results, and any violations.
4. Select **Custom** to edit the lower and upper limit for each octave band.

Streaming uses ±3 dB per band. Radio and TV/Broadcast use tighter, asymmetric
tolerances, with reduced allowances at the low and high extremes.

These profiles are practical tonal-balance guides, not official frequency
response specifications or certification checks. In particular, EBU R128
specifies programme loudness and true-peak measurement; this feature does not
measure those quantities. Results are relative to the uploaded reference and
do not replace loudness, peak, or delivery-format checks.

All analysis runs locally in the browser using the existing analyzed spectrum;
audio is not uploaded.
